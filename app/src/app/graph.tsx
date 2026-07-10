/**
 * "The web of your stuff" — a LIVE force-directed graph of what's out in the wild.
 *
 * A real d3-force simulation (charge repulsion + link springs + centering +
 * collision), not a fixed radial layout: YOU are pinned at the center, each
 * person holding your stuff floats on link-springs around you, and their items
 * hang off them as leaves (short, strong springs → they HUG their person). The
 * web breathes, you can drag nodes and the whole thing follows, tapping a node
 * pops a liquid-glass info card, and changing the Sort/Show menus re-heats the
 * sim so it flows to a new shape. Lent-side only.
 *
 * Perf: the sim is driven by our own rAF loop and SLEEPS as soon as it settles
 * (alpha < alphaMin) — reheated on drag or a filter change. Node count is capped
 * (≤8 people × ≤4 leaves + You ≈ 41). Positions live in reanimated shared values
 * (`makeMutable`), so ticks write values the UI thread renders — no per-tick React
 * re-render. Reduced-motion → the sim is ticked to completion once and frozen.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Line } from 'react-native-svg';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
} from 'd3-force';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  makeMutable,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '../components/Screen';
import { BackLink } from '../components/BackLink';
import { PressableScale } from '../components/PressableScale';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { MenuSelect } from '../components/MenuSelect';
import { GraphNodeCard, type GraphCardData } from '../components/GraphNodeCard';
import { dirOf, getBorrower, useLoans } from '../lib/store';
import { Borrower, Loan } from '../lib/types';
import { daysSince, loanLabel, shortDate } from '../lib/format';
import { expoOut, reduceMotion } from '../lib/motion';
import { radius, space } from '../lib/theme';
import { Theme, useTheme, useThemedStyles } from '../lib/theme-context';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const MAX_PEOPLE = 8; // beyond this the web gets unreadable — cap + "+N more"
const LEAF_CAP = 4; // visible item leaves per person before a "+N" marker
const AVATAR_MIN = 44;
const AVATAR_MAX = 66;
const YOU_D = 66;
const LEAF_HIT = 36; // tap target around a leaf
const LEAF_DOT = 12;

type SortMode = 'most' | 'longest' | 'recent';
type TypeFilter = 'all' | 'item' | 'money';

const SORTS: { value: SortMode; label: string }[] = [
  { value: 'most', label: 'Most held' },
  { value: 'longest', label: 'Longest out' },
  { value: 'recent', label: 'Recently lent' },
];
const TYPES: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'item', label: 'Items' },
  { value: 'money', label: 'Money' },
];

// A shared-value pair per node id, reused across filter changes so a node that
// survives keeps its position (continuity) instead of snapping back to center.
interface Vec {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

interface PersonData {
  borrower: Borrower;
  loans: Loan[];
  count: number;
  metric: number; // drives node size under the active Sort
}

// d3 mutates x/y/vx/vy on these in place; we mirror x/y into the shared values.
interface SimNode {
  id: string;
  kind: 'you' | 'person' | 'leaf';
  r: number;
  sv: Vec;
  person?: PersonData;
  loan?: Loan;
  plus?: number;
  fx?: number | null;
  fy?: number | null;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface SimLink {
  source: string;
  target: string;
  kind: 'hub' | 'leaf';
  dist: number;
  strength: number;
}

export default function GraphScreen() {
  const { colors, type: t } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const loans = useLoans();
  const reduce = useReducedMotion();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  const [sort, setSort] = useState<SortMode>('most');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // The tapped node's floating info card (graphify-style node-info).
  const [card, setCard] = useState<{
    id: string;
    anchorId: string;
    x: SharedValue<number>;
    y: SharedValue<number>;
    r: number;
    data: GraphCardData;
  } | null>(null);

  const cardRef = useRef(card);
  cardRef.current = card;

  // Persist a Vec per node id across rebuilds so survivors keep their spot.
  const vecs = useRef<Map<string, Vec>>(new Map());
  const getVec = (id: string, cx: number, cy: number): Vec => {
    let v = vecs.current.get(id);
    if (!v) {
      // Seed new nodes near the center with a little scatter → they fly outward.
      v = { x: makeMutable(cx + (Math.random() - 0.5) * 40), y: makeMutable(cy + (Math.random() - 0.5) * 40) };
      vecs.current.set(id, v);
    }
    return v;
  };

  // --- build the (filtered, capped) graph model -----------------------------
  const model = useMemo(() => {
    const matches = (l: Loan) =>
      l.status === 'active' && dirOf(l) === 'lent' && (typeFilter === 'all' || l.type === typeFilter);

    const byId = new Map<string, Loan[]>();
    for (const l of loans) {
      if (!matches(l)) continue;
      const list = byId.get(l.borrowerId);
      if (list) list.push(l);
      else byId.set(l.borrowerId, [l]);
    }

    const people: PersonData[] = [];
    for (const [id, ls] of byId) {
      const borrower = getBorrower(id);
      if (!borrower) continue;
      const oldest = ls.reduce((m, l) => Math.max(m, daysSince(l.lentAt)), 0);
      const newest = ls.reduce((m, l) => Math.min(m, daysSince(l.lentAt)), Infinity);
      const metric = sort === 'longest' ? oldest : sort === 'recent' ? -newest : ls.length;
      people.push({ borrower, loans: ls, count: ls.length, metric });
    }
    // Membership is always the biggest holders; Sort re-emphasises within them.
    people.sort((a, b) => b.count - a.count || a.borrower.name.localeCompare(b.borrower.name));
    const shown = people.slice(0, MAX_PEOPLE);
    return {
      shown,
      overflow: people.length - shown.length,
      total: shown.reduce((n, p) => n + p.count, 0),
      totalPeople: people.length,
    };
  }, [loans, sort, typeFilter]);

  const { shown, overflow, total } = model;
  // A signature that changes only when the node SET or sizing changes → rebuild.
  const signature = useMemo(
    () =>
      `${box ? `${Math.round(box.w)}x${Math.round(box.h)}` : 'none'}|${sort}|${shown
        .map((p) => `${p.borrower.id}:${p.count}:${Math.round(p.metric)}`)
        .join(',')}`,
    [box, sort, shown],
  );

  // --- the simulation -------------------------------------------------------
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  const rafRef = useRef<number | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const [render, setRender] = useState<{ nodes: SimNode[]; links: SimLink[] } | null>(null);

  useEffect(() => {
    if (!box || shown.length === 0) {
      simRef.current?.stop();
      simRef.current = null;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      nodesRef.current = [];
      setRender(null);
      return;
    }
    const cx = box.w / 2;
    const cy = box.h / 2;

    const metrics = shown.map((p) => p.metric);
    const minM = Math.min(...metrics);
    const maxM = Math.max(...metrics);
    const sizeFor = (m: number) =>
      maxM === minM ? (AVATAR_MIN + AVATAR_MAX) / 2 : AVATAR_MIN + ((m - minM) / (maxM - minM)) * (AVATAR_MAX - AVATAR_MIN);

    const nodes: SimNode[] = [];
    const links: SimLink[] = [];

    // Center (pinned) You node.
    nodes.push({ id: 'you', kind: 'you', r: YOU_D / 2, sv: getVec('you', cx, cy), fx: cx, fy: cy });

    for (const person of shown) {
      const pid = `p:${person.borrower.id}`;
      const pr = sizeFor(person.metric) / 2;
      nodes.push({ id: pid, kind: 'person', r: pr, sv: getVec(pid, cx, cy), person });
      // Hub links are loose + long so people fan out around You…
      links.push({ source: 'you', target: pid, kind: 'hub', dist: 128, strength: 0.4 });

      const items = person.loans;
      const showN = items.length > LEAF_CAP ? LEAF_CAP - 1 : items.length;
      items.slice(0, showN).forEach((loan) => {
        const lid = `l:${loan.id}`;
        const lr = LEAF_DOT / 2;
        nodes.push({ id: lid, kind: 'leaf', r: lr, sv: getVec(lid, cx, cy), loan });
        // …leaf links are SHORT + STRONG so items hug their person (no fling).
        links.push({ source: pid, target: lid, kind: 'leaf', dist: pr + lr + 8, strength: 0.95 });
      });
      if (items.length > LEAF_CAP) {
        const plusId = `plus:${person.borrower.id}`;
        const lr = LEAF_DOT;
        nodes.push({ id: plusId, kind: 'leaf', r: lr, sv: getVec(plusId, cx, cy), plus: items.length - showN });
        links.push({ source: pid, target: plusId, kind: 'leaf', dist: pr + lr + 8, strength: 0.95 });
      }
    }

    // Seed each d3 node from its persisted shared value so survivors don't jump.
    for (const n of nodes) {
      n.x = n.sv.x.value;
      n.y = n.sv.y.value;
    }

    // Drop shared values for nodes that no longer exist (avoid leaking).
    const live = new Set(nodes.map((n) => n.id));
    for (const id of [...vecs.current.keys()]) if (!live.has(id)) vecs.current.delete(id);

    const getCardRect = (cardX: number, cardY: number, nodeR: number, canvasW: number, canvasH: number) => {
      const CARD_W = 208;
      const CARD_H = 135;
      const gap = 12;
      const spaceMd = 12; // space.md is 12
      const spaceSm = 8;  // space.sm is 8

      const canPlaceAbove = cardY - nodeR - CARD_H - gap >= spaceMd;
      const canPlaceBelow = cardY + nodeR + gap + CARD_H <= canvasH - spaceMd;
      const dockBottom = !canPlaceAbove && canPlaceBelow;

      const left = Math.max(spaceSm, Math.min(canvasW - CARD_W - spaceSm, cardX - CARD_W / 2));
      const top = dockBottom
        ? Math.min(canvasH - CARD_H - spaceMd, cardY + nodeR + gap)
        : Math.max(spaceMd, cardY - nodeR - CARD_H - gap);

      return { left, top, right: left + CARD_W, bottom: top + CARD_H };
    };

    const cardForce = (alpha: number) => {
      const activeCard = cardRef.current;
      if (!activeCard) return;

      const cx = activeCard.x.value;
      const cy = activeCard.y.value;
      const rect = getCardRect(cx, cy, activeCard.r, box.w, box.h);
      
      const CARD_W = 208;
      const CARD_H = 135;
      
      const cardCenterX = rect.left + CARD_W / 2;
      const cardCenterY = rect.top + CARD_H / 2;
      
      const halfW = CARD_W / 2 + 20; // safety margin
      const halfH = CARD_H / 2 + 20;

      for (const n of nodes) {
        // Do not repel the selected node itself, its anchor node, or the 'you' node
        if (n.id === activeCard.id || n.id === activeCard.anchorId || n.kind === 'you') continue;
        if (n.x === undefined || n.y === undefined || n.vx === undefined || n.vy === undefined) continue;

        const dx = n.x - cardCenterX;
        const dy = n.y - cardCenterY;
        
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        
        if (absX < halfW && absY < halfH) {
          const overlapX = halfW - absX;
          const overlapY = halfH - absY;
          
          if (overlapX < overlapY) {
            // Apply soft continuous spring force
            const force = 3.5 * overlapX * alpha;
            n.vx += dx > 0 ? force : -force;
          } else {
            const force = 3.5 * overlapY * alpha;
            n.vy += dy > 0 ? force : -force;
          }
        }
      }
    };

    const avoidNameForce = (alpha: number) => {
      for (const n of nodes) {
        if (n.kind !== 'leaf') continue;
        if (n.x === undefined || n.y === undefined || n.vx === undefined || n.vy === undefined) continue;

        const parentId = n.loan ? `p:${n.loan.borrowerId}` : (n.plus != null ? `p:${n.id.split(':')[1]}` : null);
        if (!parentId) continue;

        const parentNode = nodes.find((x) => x.id === parentId);
        if (!parentNode || parentNode.x === undefined || parentNode.y === undefined) continue;

        // Repulsion source: centered just below the avatar (where the name is)
        const rx = parentNode.x;
        const ry = parentNode.y + parentNode.r + 12;

        const dx = n.x - rx;
        const dy = n.y - ry;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const safetyRadius = 28; // repulsion zone radius
        if (dist < safetyRadius && dist > 0.1) {
          // Smooth radial push away from the name tag center
          const strength = 16 * (1 - dist / safetyRadius) * alpha;
          n.vx += (dx / dist) * strength;
          n.vy += (dy / dist) * strength;
        }
      }
    };

    const sim = forceSimulation<SimNode>(nodes)
      // Leaves barely repel (they're small + should stay near their person);
      // people repel strongly so the hub spreads.
      .force('charge', forceManyBody<SimNode>().strength((d) => (d.kind === 'leaf' ? -24 : -260)))
      .force(
        'link',
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => l.dist)
          .strength((l) => l.strength),
      )
      .force('center', forceCenter(cx, cy).strength(0.04))
      .force('collide', forceCollide<SimNode>().radius((d) => d.r + 4).strength(0.8))
      .force('cardRepel', cardForce)
      .force('avoidName', avoidNameForce);

    sim.stop();

    simRef.current = sim;
    nodesRef.current = nodes;
    setRender({ nodes, links });

    const pad = 18;
    const writeAll = () => {
      for (const n of nodes) {
        n.x = Math.max(pad, Math.min(box.w - pad, n.x ?? cx));
        n.y = Math.max(pad, Math.min(box.h - pad, n.y ?? cy));
        n.sv.x.value = n.x;
        n.sv.y.value = n.y;
      }
    };

    if (reduce) {
      // Reduced motion: settle instantly, freeze, no ongoing loop.
      sim.alpha(1);
      for (let i = 0; i < 320 && sim.alpha() > sim.alphaMin(); i++) sim.tick();
      writeAll();
      return () => {
        sim.stop();
      };
    }

    // Warm start; our own rAF loop ticks until it settles, then sleeps.
    sim.alpha(0.9).alphaTarget(0);
    const frame = () => {
      sim.tick();
      writeAll();
      if (sim.alpha() > sim.alphaMin()) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        rafRef.current = null; // sleep
      }
    };
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      sim.stop();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, reduce]);

  // Wake the loop (used on drag / reheat) if it's asleep.
  const kick = () => {
    if (reduce || rafRef.current != null) return;
    const sim = simRef.current;
    const box0 = box;
    if (!sim || !box0) return;
    const pad = 18;
    const frame = () => {
      sim.tick();
      for (const n of nodesRef.current) {
        n.x = Math.max(pad, Math.min(box0.w - pad, n.x ?? 0));
        n.y = Math.max(pad, Math.min(box0.h - pad, n.y ?? 0));
        n.sv.x.value = n.x;
        n.sv.y.value = n.y;
      }
      if (sim.alpha() > sim.alphaMin()) rafRef.current = requestAnimationFrame(frame);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(frame);
  };

  // Gently reheat the simulation to push/pull leaves when the card opens or closes
  useEffect(() => {
    if (!simRef.current || !box) return;
    simRef.current.alpha(0.18);
    kick();
  }, [card]);

  // --- drag handlers (called from the UI thread via runOnJS) ----------------
  const dragStart = (id: string) => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n) return;
    setCard(null); // dragging dismisses an open card
    n.fx = n.x;
    n.fy = n.y;
    simRef.current?.alphaTarget(0.32);
    kick();
  };
  const dragMove = (id: string, dx: number, dy: number) => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n || !box) return;
    n.fx = Math.max(0, Math.min(box.w, (n.fx ?? n.x ?? 0) + dx));
    n.fy = Math.max(0, Math.min(box.h, (n.fy ?? n.y ?? 0) + dy));
    kick();
  };
  const dragEnd = (id: string) => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n) return;
    n.fx = null;
    n.fy = null;
    simRef.current?.alphaTarget(0); // let it cool → sleep
  };

  // --- tap → floating info card ---------------------------------------------
  const openPerson = (n: SimNode) => {
    const p = n.person!;
    const oldest = p.loans.reduce((m, l) => Math.max(m, daysSince(l.lentAt)), 0);
    setCard({
      id: n.id,
      anchorId: n.id,
      x: n.sv.x,
      y: n.sv.y,
      r: n.r,
      data: {
        title: p.borrower.name,
        detail: `Holding ${p.count} thing${p.count === 1 ? '' : 's'}${oldest > 0 ? ` · oldest ${oldest}d` : ''}`,
        ctaLabel: 'Open profile →',
        onOpen: () => {
          setCard(null);
          router.push(`/borrower/${p.borrower.id}`);
        },
      },
    });
  };
  const openLeaf = (n: SimNode) => {
    if (!n.loan) return;
    const loan = n.loan;
    const parentId = `p:${loan.borrowerId}`;
    const parentNode = nodesRef.current.find((x) => x.id === parentId);
    const anchorNode = parentNode || n;

    setCard({
      id: n.id,
      anchorId: anchorNode.id,
      x: anchorNode.sv.x,
      y: anchorNode.sv.y,
      r: anchorNode.r,
      data: {
        title: loanLabel(loan),
        detail: `Lent ${shortDate(loan.lentAt)}`,
        ctaLabel: 'Open loan →',
        onOpen: () => {
          setCard(null);
          router.push(`/loan/${loan.id}`);
        },
      },
    });
  };

  const onLayout = (e: LayoutChangeEvent) =>
    setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const empty = model.totalPeople === 0;

  return (
    <Screen ambient="people">
      <BackLink label="People" />
      <Text style={t.overline}>Out in the wild</Text>
      <Text style={[t.title, styles.title]}>The web of your stuff</Text>
      {!empty && (
        <Text style={styles.sub}>
          {total} thing{total === 1 ? '' : 's'} with {shown.length} {shown.length === 1 ? 'person' : 'people'}
          {overflow > 0 ? ` · +${overflow} more not shown` : ''}
        </Text>
      )}

      {/* Sort / Show — two clean menu selectors below the header. */}
      {!empty && (
        <View style={styles.menuRow}>
          <MenuSelect<SortMode> title="Sort" options={SORTS} value={sort} onChange={setSort} />
          <MenuSelect<TypeFilter> title="Show" options={TYPES} value={typeFilter} onChange={setTypeFilter} />
        </View>
      )}

      {empty ? (
        <View style={styles.empty}>
          <Icon name="cactus" size={56} color={colors.inkSoft} />
          <Text style={styles.emptyText}>
            {typeFilter !== 'all'
              ? 'Nothing matches this filter — try “All”.'
              : 'Nothing’s out in the wild yet — nothing to map. Lend something and it’ll show up here.'}
          </Text>
          <Button label="Back to People" variant="pill" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={styles.canvas} onLayout={onLayout}>
          {render && (
            <>
              {/* Edges — behind the nodes, distance-faded, non-interactive. */}
              <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                {render.links.map((lk, i) => {
                  const sourceId = typeof lk.source === 'object' ? (lk.source as any).id : lk.source;
                  const targetId = typeof lk.target === 'object' ? (lk.target as any).id : lk.target;
                  const a = render.nodes.find((n) => n.id === sourceId);
                  const b = render.nodes.find((n) => n.id === targetId);
                  if (!a || !b) return null;
                  return (
                    <Edge
                      key={`${sourceId}->${targetId}-${i}`}
                      a={a.sv}
                      b={b.sv}
                      hub={lk.kind === 'hub'}
                      stroke={colors.inkFaint}
                    />
                  );
                })}
              </Svg>

              {/* Tap-outside-to-dismiss layer, below the nodes so node taps still
                  switch the selection. Only present while a card is open. */}
              {card && <Pressable style={StyleSheet.absoluteFill} onPress={() => setCard(null)} />}

              {render.nodes.map((n, i) => {
                if (n.kind === 'you') {
                  return (
                    <NodeShell key={n.id} sv={n.sv} size={YOU_D} index={0} reduce={reduce}>
                      <View style={[styles.youNode, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.youText, { color: colors.onAccent }]}>You</Text>
                      </View>
                    </NodeShell>
                  );
                }
                if (n.kind === 'person' && n.person) {
                  return (
                    <PersonNode
                      key={n.id}
                      node={n}
                      index={i}
                      reduce={reduce}
                      selected={card?.id === n.id}
                      onSelect={() => openPerson(n)}
                      onDragStart={dragStart}
                      onDragMove={dragMove}
                      onDragEnd={dragEnd}
                      styles={styles}
                    />
                  );
                }
                // leaf or "+N"
                if (n.plus != null) {
                  return (
                    <NodeShell key={n.id} sv={n.sv} size={LEAF_HIT} index={i} reduce={reduce}>
                      <View style={styles.plusPill}>
                        <Text style={styles.plusText}>+{n.plus}</Text>
                      </View>
                    </NodeShell>
                  );
                }
                return (
                  <LeafNode
                    key={n.id}
                    node={n}
                    index={i}
                    reduce={reduce}
                    selected={card?.id === n.id}
                    onPress={() => openLeaf(n)}
                    styles={styles}
                  />
                );
              })}

              {card && box && (
                // Keyed by node id so switching selection FULLY remounts the card
                // (and its iOS GlassView) — a persisted GlassView that just moves
                // leaves a clear artifact over the screen.
                <GraphNodeCard
                  key={card.id}
                  data={card.data}
                  x={card.x}
                  y={card.y}
                  r={card.r}
                  canvasW={box.w}
                  canvasH={box.h}
                  onDismiss={() => setCard(null)}
                />
              )}
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

// --- edge (animated SVG line, distance-faded) ------------------------------
function Edge({ a, b, hub, stroke }: { a: Vec; b: Vec; hub: boolean; stroke: string }) {
  const props = useAnimatedProps(() => {
    const dx = b.x.value - a.x.value;
    const dy = b.y.value - a.y.value;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Clearly connected but still recessive — a gentle distance fade with a solid
    // floor so the web reads on BOTH light and dark (was near-invisible before).
    const opacity = hub
      ? interpolate(dist, [70, 260], [0.7, 0.4])
      : interpolate(dist, [24, 120], [0.62, 0.34]);
    return {
      x1: a.x.value,
      y1: a.y.value,
      x2: b.x.value,
      y2: b.y.value,
      strokeOpacity: Math.max(0.32, Math.min(0.72, opacity)),
    };
  });
  return <AnimatedLine animatedProps={props} stroke={stroke} strokeWidth={hub ? 2.2 : 1.6} strokeLinecap="round" />;
}

// --- node shell: positions by shared value, entrance + idle breathe ---------
function NodeShell({
  sv,
  size,
  index,
  reduce,
  children,
}: {
  sv: Vec;
  size: number;
  index: number;
  reduce: boolean;
  children: React.ReactNode;
}) {
  const enter = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(Math.min(index * 35, 500), withTiming(1, { duration: 520, easing: expoOut, reduceMotion }));
    if (!reduce) {
      breathe.value = withDelay(
        600 + index * 40,
        withRepeat(withTiming(1, { duration: 2600 + (index % 5) * 220, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outer view = raw position (top-left) so the shared value maps to node center.
  const posStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sv.x.value - size / 2 }, { translateY: sv.y.value - size / 2 }],
  }));
  // Inner view = entrance scale/opacity × subtle breathing (scales about its center).
  const lifeStyle = useAnimatedStyle(() => {
    const grow = interpolate(enter.value, [0, 1], [0.55, 1]);
    const b = reduce ? 1 : 1 + breathe.value * 0.035;
    return { opacity: enter.value, transform: [{ scale: grow * b }] };
  });

  return (
    <Animated.View style={[shell.shell, { width: size, height: size }, posStyle]} pointerEvents="box-none">
      <Animated.View style={[shell.inner, lifeStyle]} pointerEvents="box-none">
        {children}
      </Animated.View>
    </Animated.View>
  );
}

type StyleSheetT = ReturnType<typeof makeStyles>;

// --- person node (draggable + tappable) ------------------------------------
function PersonNode({
  node,
  index,
  reduce,
  selected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  styles: s,
}: {
  node: SimNode;
  index: number;
  reduce: boolean;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, dx: number, dy: number) => void;
  onDragEnd: (id: string) => void;
  styles: StyleSheetT;
}) {
  const person = node.person!;
  const d = node.r * 2;
  const BOX = 100;

  const enter = useSharedValue(0);
  const breathe = useSharedValue(0);
  const grab = useSharedValue(0); // lifts the node while dragged
  useEffect(() => {
    enter.value = withDelay(Math.min(index * 35, 500), withTiming(1, { duration: 520, easing: expoOut, reduceMotion }));
    if (!reduce) {
      breathe.value = withDelay(
        600 + index * 40,
        withRepeat(withTiming(1, { duration: 2600 + (index % 5) * 220, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const posStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: node.sv.x.value - BOX / 2 }, { translateY: node.sv.y.value - d / 2 }],
  }));
  const lifeStyle = useAnimatedStyle(() => {
    const grow = interpolate(enter.value, [0, 1], [0.55, 1]);
    const b = reduce ? 1 : 1 + breathe.value * 0.035;
    return { opacity: enter.value, transform: [{ scale: grow * b + grab.value * 0.06 }] };
  });

  // Tap selects (opens card); Pan drags. Race so a still tap never starts a drag.
  const tap = Gesture.Tap()
    .maxDistance(10)
    .onEnd((_e, ok) => {
      if (ok) runOnJS(onSelect)();
    });
  const pan = Gesture.Pan()
    .minDistance(6)
    .enabled(!reduce) // no drag jiggle under reduced motion
    .onBegin(() => {
      grab.value = withTiming(1, { duration: 140 });
      runOnJS(onDragStart)(node.id);
    })
    .onChange((e) => {
      runOnJS(onDragMove)(node.id, e.changeX, e.changeY);
    })
    .onFinalize(() => {
      grab.value = withTiming(0, { duration: 200 });
      runOnJS(onDragEnd)(node.id);
    });
  const gesture = Gesture.Race(pan, tap);

  return (
    <Animated.View style={[shell.shell, { width: BOX, height: BOX }, posStyle]} pointerEvents="box-none">
      <GestureDetector gesture={gesture}>
        <Animated.View style={[s.personInner, lifeStyle]}>
          <View style={[s.personRing, { width: d, height: d, borderRadius: d / 2 }, selected && s.personRingOn]}>
            <Avatar name={person.borrower.name} emoji={person.borrower.emoji} uri={person.borrower.avatarUrl} size={d - 6} />
            <View style={s.countBadge}>
              <Text style={s.countText}>{person.count}</Text>
            </View>
          </View>
          <Text style={[s.personName, selected && s.personNameOn]} numberOfLines={1}>
            {person.borrower.name}
          </Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// --- leaf node (tap → info card) -------------------------------------------
function LeafNode({
  node,
  index,
  reduce,
  selected,
  onPress,
  styles: s,
}: {
  node: SimNode;
  index: number;
  reduce: boolean;
  selected: boolean;
  onPress: () => void;
  styles: StyleSheetT;
}) {
  const enter = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(Math.min(index * 35, 500), withTiming(1, { duration: 520, easing: expoOut, reduceMotion }));
    if (!reduce) {
      breathe.value = withDelay(
        600 + index * 40,
        withRepeat(withTiming(1, { duration: 2600 + (index % 5) * 220, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const posStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: node.sv.x.value - LEAF_HIT / 2 }, { translateY: node.sv.y.value - LEAF_HIT / 2 }],
  }));
  const lifeStyle = useAnimatedStyle(() => {
    const grow = interpolate(enter.value, [0, 1], [0.5, 1]);
    const b = reduce ? 1 : 1 + breathe.value * 0.05;
    return { opacity: enter.value, transform: [{ scale: grow * b }] };
  });
  return (
    <Animated.View style={[shell.shell, { width: LEAF_HIT, height: LEAF_HIT }, posStyle]} pointerEvents="box-none">
      <Animated.View style={[shell.inner, lifeStyle]}>
        <PressableScale
          onPress={onPress}
          scaleTo={0.82}
          style={s.leafPress}
          accessibilityRole="button"
          accessibilityLabel={node.loan ? loanLabel(node.loan) : 'Item'}
        >
          <View style={[s.leafDot, selected && s.leafDotOn]} />
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

// Non-themed shell layout (position wrapper); themed bits come via makeStyles.
const shell = StyleSheet.create({
  shell: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center' },
});

const makeStyles = (th: Theme) =>
  StyleSheet.create({
    title: { marginTop: space.xs },
    sub: { ...th.type.small, color: th.colors.inkSoft, marginTop: space.xs },
    menuRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md, flexWrap: 'wrap' },
    canvas: { flex: 1, marginTop: space.md },
    youNode: {
      width: YOU_D,
      height: YOU_D,
      borderRadius: YOU_D / 2,
      alignItems: 'center',
      justifyContent: 'center',
      ...th.shadow.lifted,
    },
    youText: { ...th.type.h3, fontSize: 15, fontWeight: '800' },
    personInner: { alignItems: 'center', gap: 4, width: 100 },
    personRing: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: th.colors.surface,
      borderWidth: 1.5,
      borderColor: th.colors.hairline,
      ...th.shadow.card,
    },
    // Subtle selected emphasis — an accent rim + a touch more lift.
    personRingOn: { borderColor: th.colors.accent, borderWidth: 2.5, ...th.shadow.lifted },
    countBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: radius.pill,
      backgroundColor: th.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: { ...th.type.small, fontSize: 11, fontWeight: '800', color: th.colors.surface },
    personName: { ...th.type.small, color: th.colors.ink, fontWeight: '700', maxWidth: 96, textAlign: 'center' },
    personNameOn: { color: th.colors.accent },
    leafPress: { width: LEAF_HIT, height: LEAF_HIT, alignItems: 'center', justifyContent: 'center' },
    leafDot: {
      width: LEAF_DOT,
      height: LEAF_DOT,
      borderRadius: LEAF_DOT / 2,
      borderWidth: 1.5,
      borderColor: th.colors.bg,
      backgroundColor: th.colors.inkSoft,
    },
    leafDotOn: {
      width: LEAF_DOT + 4,
      height: LEAF_DOT + 4,
      borderRadius: (LEAF_DOT + 4) / 2,
      backgroundColor: th.colors.accent,
    },
    plusPill: {
      minWidth: 34,
      height: 24,
      paddingHorizontal: 6,
      borderRadius: radius.pill,
      backgroundColor: th.colors.bgSunken,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusText: { ...th.type.small, fontSize: 11, fontWeight: '800', color: th.colors.inkSoft },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.md,
      paddingHorizontal: space.xl,
    },
    emptyText: { ...th.type.bodySoft, textAlign: 'center' },
  });

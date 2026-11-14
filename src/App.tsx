import { useEffect, useState } from "react";
import { SessionProvider, useSession } from "./session";
import { Trips } from "./screens/Trips";
import { TripDetail } from "./screens/TripDetail";
import { PlaceEdit } from "./screens/PlaceEdit";
import { PlaceCard } from "./screens/PlaceCard";
import { MapView } from "./screens/MapView";
import { Settings } from "./screens/Settings";
import { TabBar, type TabKey } from "./components/TabBar";

type View =
  | { name: "trips" }
  | { name: "trip"; id: string }
  | { name: "place"; id: string }
  | { name: "placeEdit"; id: string | null; tripId?: string }
  | { name: "map" }
  | { name: "settings" };

function isTabView(name: View["name"]): name is TabKey {
  return name === "trips" || name === "map" || name === "settings";
}

/** 화면 전체(body)가 아니라 이 가운데 영역만 스크롤되게 해서, 탭바와 각 화면 안의 sticky 헤더가
 * 모바일 브라우저 주소창 접힘/펴짐에 흔들리지 않고 항상 제자리에 있게 한다. */
function Shell({ children, tabBar, scrollKey }: { children: React.ReactNode; tabBar?: React.ReactNode; scrollKey: string }) {
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        // 화면이 바뀌면 스크롤 영역을 새로 만들어 맨 위에서 시작하게 한다(긴 목록을 내린 채로 상세로 들어가는 것 방지).
        key={scrollKey}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehaviorY: "contain",
          WebkitOverflowScrolling: "touch",
          paddingInline: 16,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {children}
      </div>
      {tabBar}
    </div>
  );
}

/** 화면 이동을 스택으로 관리하고 브라우저 히스토리와 맞춘다 — 안드로이드 뒤로가기·iOS 스와이프가
 * 앱을 닫는 대신 이전 화면으로 돌아가고, 상세 화면의 "← 뒤로"도 실제로 들어온 곳으로 돌아간다. */
function useNavStack() {
  const [stack, setStack] = useState<View[]>([{ name: "trips" }]);

  useEffect(() => {
    history.replaceState({ depth: 0 }, "");
    const onPop = (e: PopStateEvent) => {
      const depth = typeof e.state?.depth === "number" ? e.state.depth : 0;
      setStack((s) => s.slice(0, Math.max(1, Math.min(s.length, depth + 1))));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const push = (v: View) => {
    history.pushState({ depth: stack.length }, "");
    setStack([...stack, v]);
  };
  const back = () => {
    if (stack.length > 1) history.back();
  };
  /** 맨 위 화면만 바꿔치기 — 새 장소 저장 후 "편집 화면" 자리를 "장소 카드"로 바꿀 때. */
  const replace = (v: View) => setStack([...stack.slice(0, -1), v]);
  /** 탭 전환 — 탭은 항상 맨 아래 화면이다. */
  const switchTab = (tab: TabKey) => {
    if (stack.length > 1) history.go(-(stack.length - 1));
    setStack([{ name: tab } as View]);
  };

  return { view: stack[stack.length - 1], depth: stack.length, push, back, replace, switchTab };
}

function Gate() {
  const { vault } = useSession();
  const nav = useNavStack();
  const { view } = nav;

  if (!vault) return null;

  const showTabBar = isTabView(view.name);

  const screen = (() => {
    switch (view.name) {
      case "trips":
        return (
          <Trips
            onOpenTrip={(id) => nav.push({ name: "trip", id })}
            onAddPlace={() => nav.push({ name: "placeEdit", id: null })}
            onOpenPlace={(id) => nav.push({ name: "place", id })}
          />
        );
      case "trip":
        return (
          <TripDetail
            id={view.id}
            onBack={nav.back}
            onAddPlace={(tripId) => nav.push({ name: "placeEdit", id: null, tripId })}
            onOpenPlace={(id) => nav.push({ name: "place", id })}
          />
        );
      case "place":
        return <PlaceCard id={view.id} onBack={nav.back} onEdit={(id) => nav.push({ name: "placeEdit", id })} />;
      case "placeEdit":
        return (
          <PlaceEdit
            id={view.id}
            tripId={view.tripId}
            onDone={(id) => (view.id ? nav.back() : nav.replace({ name: "place", id }))}
            onCancel={nav.back}
          />
        );
      case "map":
        return <MapView onOpenPlace={(id) => nav.push({ name: "place", id })} />;
      case "settings":
        return <Settings />;
    }
  })();

  return (
    <Shell scrollKey={`${nav.depth}:${view.name}`} tabBar={showTabBar && <TabBar tab={view.name as TabKey} onChange={nav.switchTab} />}>
      {screen}
    </Shell>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}

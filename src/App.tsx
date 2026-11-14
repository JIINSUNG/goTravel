import { useState } from "react";
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
function Shell({ children, tabBar }: { children: React.ReactNode; tabBar?: React.ReactNode }) {
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          overscrollBehaviorY: "contain",
          WebkitOverflowScrolling: "touch",
          paddingInline: 16,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {children}
      </div>
      {tabBar}
    </div>
  );
}

function Gate() {
  const { vault } = useSession();
  const [view, setView] = useState<View>({ name: "trips" });

  if (!vault) return null;

  const showTabBar = isTabView(view.name);

  const screen = (() => {
    switch (view.name) {
      case "trips":
        return (
          <Trips
            onOpenTrip={(id) => setView({ name: "trip", id })}
            onAddPlace={() => setView({ name: "placeEdit", id: null })}
            onOpenPlace={(id) => setView({ name: "place", id })}
          />
        );
      case "trip":
        return (
          <TripDetail
            id={view.id}
            onBack={() => setView({ name: "trips" })}
            onAddPlace={(tripId) => setView({ name: "placeEdit", id: null, tripId })}
            onOpenPlace={(id) => setView({ name: "place", id })}
          />
        );
      case "place":
        return <PlaceCard id={view.id} onBack={() => setView({ name: "trips" })} onEdit={(id) => setView({ name: "placeEdit", id })} />;
      case "placeEdit":
        return (
          <PlaceEdit
            id={view.id}
            tripId={view.tripId}
            onDone={(id) => setView({ name: "place", id })}
            onCancel={() => setView(view.id ? { name: "place", id: view.id } : view.tripId ? { name: "trip", id: view.tripId } : { name: "trips" })}
          />
        );
      case "map":
        return <MapView onOpenPlace={(id) => setView({ name: "place", id })} />;
      case "settings":
        return <Settings onBack={() => setView({ name: "trips" })} />;
    }
  })();

  return <Shell tabBar={showTabBar && <TabBar tab={view.name as TabKey} onChange={(tab) => setView({ name: tab } as View)} />}>{screen}</Shell>;
}

export default function App() {
  return (
    <SessionProvider>
      <Gate />
    </SessionProvider>
  );
}

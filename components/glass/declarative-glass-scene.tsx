"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { MomentumGlass } from "@/components/glass/liquid-glass";

type RegisteredScene = {
  id: string;
  content: ReactNode;
};

type RegisterScene = (scene: RegisteredScene) => () => void;

const DeclarativeGlassSceneContentContext =
  createContext<RegisteredScene | null>(null);
const DeclarativeGlassSceneRegistrationContext =
  createContext<RegisterScene | null>(null);

export function DeclarativeGlassSceneProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [scene, setScene] = useState<RegisteredScene | null>(null);

  const registerScene = useCallback((nextScene: RegisteredScene) => {
    setScene(nextScene);

    return () => {
      setScene((current) =>
        current?.id === nextScene.id ? null : current,
      );
    };
  }, []);

  return (
    <DeclarativeGlassSceneRegistrationContext.Provider value={registerScene}>
      <DeclarativeGlassSceneContentContext.Provider value={scene}>
        {children}
      </DeclarativeGlassSceneContentContext.Provider>
    </DeclarativeGlassSceneRegistrationContext.Provider>
  );
}

export function DeclarativeGlassSceneRegistration({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const registerScene = useContext(DeclarativeGlassSceneRegistrationContext);

  useEffect(() => {
    if (!registerScene) return;
    return registerScene({ id, content: children });
  }, [children, id, registerScene]);

  return null;
}

export function useDeclarativeGlassScene() {
  return useContext(DeclarativeGlassSceneContentContext);
}

export function useDeclarativeSceneSupport(sceneId: string | null) {
  const scene = useDeclarativeGlassScene();
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isSafari =
      /AppleWebKit\//.test(userAgent) &&
      !/(?:Chrome|Chromium|CriOS|Edg|OPR|Android)\//.test(userAgent);
    const forceInDevelopment =
      process.env.NODE_ENV !== "production" &&
      new URLSearchParams(window.location.search).has("declarativeGlass");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduceTransparency = window.matchMedia(
      "(prefers-reduced-transparency: reduce)",
    );
    const supportsScrollTimeline =
      CSS.supports("animation-timeline", "scroll(root block)") ||
      CSS.supports("animation-timeline: scroll(root block)");

    const update = () => {
      setSupported(
        (isSafari || forceInDevelopment) &&
          !reduceMotion.matches &&
          !reduceTransparency.matches &&
          supportsScrollTimeline,
      );
    };

    update();
    reduceMotion.addEventListener("change", update);
    reduceTransparency.addEventListener("change", update);

    return () => {
      reduceMotion.removeEventListener("change", update);
      reduceTransparency.removeEventListener("change", update);
    };
  }, []);

  return supported && scene?.id === sceneId;
}

export function primaryGlassSceneId(pathname: string) {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/applications") return "applications";
  if (pathname === "/analytics") return "analytics";
  if (pathname === "/calendar") return "calendar";
  if (pathname === "/import") return "import";
  return null;
}

export function DeclarativeGlassSceneCopy({
  sceneId,
  horizontal = "center",
  vertical = "top",
  viewportInsetX = 0,
  viewportInsetY,
}: {
  sceneId: string;
  horizontal?: "left" | "center" | "right";
  vertical?: "top" | "bottom";
  viewportInsetX?: number;
  viewportInsetY: number;
}) {
  const scene = useDeclarativeGlassScene();

  if (scene?.id !== sceneId) return null;

  const left =
    horizontal === "left"
      ? -viewportInsetX
      : horizontal === "right"
        ? `calc(100% - 100vw + ${viewportInsetX}px)`
        : "calc((100% - 100vw) / 2)";
  const top =
    vertical === "bottom"
      ? `calc(100% - 100dvh + ${viewportInsetY}px)`
      : -viewportInsetY;

  return (
    <div
      aria-hidden="true"
      className="declarative-glass-scene-copy"
      inert
      style={{ left, top }}
    >
      {scene.content}
    </div>
  );
}

export function DeclarativeGlassLens({
  sceneId,
  horizontal,
  vertical,
  viewportInsetX,
  viewportInsetY,
  mobile = false,
}: {
  sceneId: string;
  horizontal?: "left" | "center" | "right";
  vertical?: "top" | "bottom";
  viewportInsetX?: number;
  viewportInsetY: number;
  mobile?: boolean;
}) {
  return (
    <>
      <MomentumGlass
        aria-hidden="true"
        variant="nav"
        refract={
          <DeclarativeGlassSceneCopy
            sceneId={sceneId}
            horizontal={horizontal}
            vertical={vertical}
            viewportInsetX={viewportInsetX}
            viewportInsetY={viewportInsetY}
          />
        }
        behind="transparent"
        live
        pixelUnits
        filterResolution={1}
        optics={{
          mapSize: mobile ? 96 : 128,
          depth: mobile ? 0.5 : 0.56,
          curvature: mobile ? 0.1 : 0.12,
          dispersion: 0,
          strength: mobile ? 0.05 : 0.065,
          bend: mobile ? 0.5 : 0.58,
          bendWidth: 0.12,
          frost: mobile ? 3 : 4,
        }}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: "inherit",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <span
        aria-hidden="true"
        className="declarative-glass-tint absolute inset-0 z-[1] rounded-[inherit]"
      />
    </>
  );
}

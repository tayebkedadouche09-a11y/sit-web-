import { useMemo } from "react";

type Star = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  depth: number;
  delay: number;
};

type Body = {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
};

function seededStars(count: number): Star[] {
  let seed = 918273;
  const rnd = () => {
    seed = (seed * 48271) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  return Array.from({ length: count }, () => ({
    left: rnd() * 100,
    top: rnd() * 100,
    size: 0.5 + rnd() * 2.4,
    opacity: 0.18 + rnd() * 0.82,
    depth: 0.2 + rnd() * 1.8,
    delay: rnd() * 8,
  }));
}

function seededBodies(count: number, seedStart: number): Body[] {
  let seed = seedStart;
  const rnd = () => {
    seed = (seed * 48271) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  return Array.from({ length: count }, () => ({
    left: 4 + rnd() * 92,
    top: 8 + rnd() * 74,
    size: 2 + rnd() * 5,
    delay: -rnd() * 18,
    duration: 16 + rnd() * 24,
  }));
}

export default function SpaceScene() {
  const stars = useMemo(() => seededStars(320), []);
  const starsFar = useMemo(() => seededStars(170), []);
  const asteroids = useMemo(() => seededBodies(18, 72137), []);
  const meteors = useMemo(() => seededBodies(5, 193847), []);

  return (
    <div className="space-scene" aria-hidden="true">
      <div className="space-backdrop" />
      <div className="space-nebula space-nebula--violet" />
      <div className="space-nebula space-nebula--blue" />
      <div className="space-nebula space-nebula--teal" />
      <div className="space-milky-way" />

      <div className="space-stars space-stars--far">
        {starsFar.map((s, i) => (
          <span
            key={i}
            className="space-star space-star--far"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity * 0.6,
              animationDelay: `${s.delay}s`,
              transform: `translateZ(-${s.depth * 40}px)`,
            }}
          />
        ))}
      </div>

      <div className="space-stars">
        {stars.map((s, i) => (
          <span
            key={i}
            className={`space-star ${s.size > 2.1 ? "space-star--bright" : ""}`}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="space-black-hole">
        <div className="black-hole-glow" />
        <div className="black-hole-disk black-hole-disk--outer" />
        <div className="black-hole-disk black-hole-disk--inner" />
        <div className="black-hole-core" />
        <span className="black-hole-lens" />
      </div>

      <div className="space-planet space-planet--blue">
        <span className="planet-atmosphere" />
        <span className="planet-clouds" />
        <span className="planet-land planet-land--a" />
        <span className="planet-land planet-land--b" />
        <span className="planet-shadow" />
      </div>

      <div className="space-planet space-planet--ringed">
        <span className="planet-ring planet-ring--rear" />
        <span className="planet-body planet-body--gold" />
        <span className="planet-ring planet-ring--front" />
        <span className="planet-shadow" />
      </div>

      <div className="space-planet space-planet--red">
        <span className="planet-body planet-body--red" />
        <span className="planet-ridges" />
        <span className="planet-shadow" />
      </div>

      <div className="asteroid-belt">
        {asteroids.map((a, i) => (
          <span
            key={i}
            className="asteroid"
            style={{
              left: `${a.left}%`,
              top: `${a.top}%`,
              width: a.size,
              height: a.size * 0.72,
              animationDelay: `${a.delay}s`,
              animationDuration: `${a.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="space-meteors">
        {meteors.map((m, i) => (
          <span
            key={i}
            className="space-meteor"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="space-vignette" />
    </div>
  );
}

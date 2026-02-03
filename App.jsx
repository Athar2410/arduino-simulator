import { useEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import Xarrow, { Xwrapper, useXarrow } from "react-xarrows";

const ALL_PINS = Array.from({ length: 12 }, (_, i) => i + 2); // 2..13

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateArduinoCode({ ledPin, buttonPin }) {
  return `// Auto-generated
const int LED_PIN = ${ledPin};
const int BUTTON_PIN = ${buttonPin};

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT);
}

void loop() {
  if (digitalRead(BUTTON_PIN) == HIGH) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
}`;
}

function PlacedItem({ c, setPlaced, children }) {
  const updateXarrow = useXarrow();
  const nodeRef = useRef(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      bounds="parent"
      defaultPosition={{ x: c.x, y: c.y }}
      onDrag={updateXarrow}
      onStop={(e, data) => {
        setPlaced((prev) =>
          prev.map((p) => (p.id === c.id ? { ...p, x: data.x, y: data.y } : p))
        );
        updateXarrow();
      }}
    >
      <div ref={nodeRef} style={{ display: "inline-block", cursor: "grab" }}>
        {children}
      </div>
    </Draggable>
  );
}

export default function App() {
  const paletteItems = useMemo(
    () => [
      { type: "arduino", label: "Arduino Uno" },
      { type: "led", label: "LED" },
      { type: "button", label: "Push Button" },
    ],
    []
  );

  const [view, setView] = useState("components"); // "components" | "code"
  const [running, setRunning] = useState(false);

  // Task 3 state
  const [buttonPressed, setButtonPressed] = useState(false);
  const ledRef = useRef(null);
  const pushBtnRef = useRef(null);
  const ledOn = running && buttonPressed;

  // Task 1/2 placement + rules
  const [placed, setPlaced] = useState([]); // {id,type,x,y}
  const [circuit, setCircuit] = useState({
    ledPin: 10,
    buttonPin: 2,
    hasLed: false,
    hasButton: false,
    hasArduino: false,
  });

  // Task 2: exclude used pin from other dropdown
  const ledOptions = ALL_PINS.filter((p) => p === circuit.ledPin || p !== circuit.buttonPin);
  const buttonOptions = ALL_PINS.filter((p) => p === circuit.buttonPin || p !== circuit.ledPin);

  const onDropToCanvas = (e) => {
    e.preventDefault();

    const type = e.dataTransfer.getData("text/plain");
    if (!type) return;

    if (type === "arduino" && circuit.hasArduino) return;
    if (type === "led" && circuit.hasLed) return;
    if (type === "button" && circuit.hasButton) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let x = Math.round(e.clientX - rect.left);
    let y = Math.round(e.clientY - rect.top);

    if (type === "arduino") { x -= 80; y -= 40; }
    if (type === "led") { x -= 10; y -= 10; }
    if (type === "button") { x -= 20; y -= 10; }

    setPlaced((prev) => [...prev, { id: makeId(), type, x, y }]);

    setCircuit((prev) => ({
      ...prev,
      hasArduino: prev.hasArduino || type === "arduino",
      hasLed: prev.hasLed || type === "led",
      hasButton: prev.hasButton || type === "button",
    }));
  };

  // Task 3: drive LED
  useEffect(() => {
    if (!ledRef.current) return;
    ledRef.current.value = !!ledOn;
    ledRef.current.brightness = ledOn ? 1 : 0;
  }, [ledOn]);

  // Task 3: listen to pushbutton events (and keep a fallback)
  useEffect(() => {
    const btnEl = pushBtnRef.current;
    if (!btnEl) return;

    const onPress = () => { if (running) setButtonPressed(true); };
    const onRelease = () => setButtonPressed(false);

    btnEl.addEventListener("button-press", onPress);
    btnEl.addEventListener("button-release", onRelease);

    return () => {
      btnEl.removeEventListener("button-press", onPress);
      btnEl.removeEventListener("button-release", onRelease);
    };
  }, [running]);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, Arial", color: "#111" }}>
      {/* Left palette */}
      <aside style={{ width: 280, borderRight: "1px solid #ddd", padding: 12, background: "#fff" }}>
        <h3 style={{ marginTop: 0 }}>Palette</h3>

        {paletteItems.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", item.type)}
            style={{
              padding: 10,
              marginBottom: 10,
              border: "1px solid #ccc",
              borderRadius: 10,
              cursor: "grab",
              background: "white",
              userSelect: "none",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ transform: "scale(0.45)", transformOrigin: "left center", pointerEvents: "none" }}>
                {item.type === "arduino" && <wokwi-arduino-uno></wokwi-arduino-uno>}
                {item.type === "led" && <wokwi-led color="red"></wokwi-led>}
                {item.type === "button" && <wokwi-pushbutton></wokwi-pushbutton>}
              </div>
              <div>{item.label}</div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 14, padding: 10, border: "1px solid #ddd", borderRadius: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Pin Settings</div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <label style={{ width: 70 }}>LED</label>
            <select
              disabled={!circuit.hasLed}
              value={circuit.ledPin}
              onChange={(e) => setCircuit((prev) => ({ ...prev, ledPin: Number(e.target.value) }))}
              style={{ flex: 1 }}
            >
              {ledOptions.map((p) => (
                <option key={p} value={p}>D{p}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ width: 70 }}>Button</label>
            <select
              disabled={!circuit.hasButton}
              value={circuit.buttonPin}
              onChange={(e) => setCircuit((prev) => ({ ...prev, buttonPin: Number(e.target.value) }))}
              style={{ flex: 1 }}
            >
              {buttonOptions.map((p) => (
                <option key={p} value={p}>D{p}</option>
              ))}
            </select>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <div style={{ borderBottom: "1px solid #ddd", padding: 8, display: "flex", gap: 8, background: "#fff" }}>
          <button onClick={() => setView("components")} disabled={view === "components"}>Component view</button>
          <button onClick={() => setView("code")} disabled={view === "code"}>Code view</button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => setRunning(true)} disabled={running}>Start</button>
            <button onClick={() => { setRunning(false); setButtonPressed(false); }} disabled={!running}>
              Stop
            </button>
          </div>
        </div>

        {/* Canvas + Code */}
        <div style={{ flex: 1, display: "flex" }}>
          <div
            id="canvas"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropToCanvas}
            style={{ flex: 1, position: "relative", background: "#f6f7fb", overflow: "hidden" }}
          >
            <Xwrapper>
              {placed.map((c) => (
                <PlacedItem key={c.id} c={c} setPlaced={setPlaced}>
                  <div style={{ position: "relative", padding: 4 }}>
                    {c.type === "arduino" && (
                      <div id="arduino-node" style={{ position: "relative", display: "inline-block" }}>
                        <wokwi-arduino-uno></wokwi-arduino-uno>

                        {/* pin targets for arrows */}
                        <div
                          style={{
                            position: "absolute",
                            right: -90,
                            top: 8,
                            width: 80,
                            background: "rgba(255,255,255,0.95)",
                            border: "1px solid #ddd",
                            borderRadius: 10,
                            padding: 8,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Pins</div>
                          {ALL_PINS.map((pin) => (
                            <div
                              key={pin}
                              id={`pin-${pin}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                padding: "2px 4px",
                                borderRadius: 6,
                                border:
                                  pin === circuit.ledPin || pin === circuit.buttonPin
                                    ? "1px solid #999"
                                    : "1px solid transparent",
                              }}
                            >
                              <span style={{ fontSize: 12 }}>D{pin}</span>
                              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(0,0,0,0.25)" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {c.type === "led" && (
                      <div id="led-node" style={{ display: "inline-block" }}>
                        <wokwi-led ref={ledRef} color="red"></wokwi-led>
                      </div>
                    )}

                    {c.type === "button" && (
                      <div
                        id="button-node"
                        style={{ display: "inline-block" }}
                        onPointerDown={() => running && setButtonPressed(true)}
                        onPointerUp={() => setButtonPressed(false)}
                        onPointerLeave={() => setButtonPressed(false)}
                        onPointerCancel={() => setButtonPressed(false)}
                      >
                        <wokwi-pushbutton ref={pushBtnRef}></wokwi-pushbutton>
                      </div>
                    )}
                  </div>
                </PlacedItem>
              ))}

              {circuit.hasLed && circuit.hasArduino && (
                <Xarrow start="led-node" end={`pin-${circuit.ledPin}`} />
              )}
              {circuit.hasButton && circuit.hasArduino && (
                <Xarrow start="button-node" end={`pin-${circuit.buttonPin}`} />
              )}
            </Xwrapper>

            <div style={{ position: "absolute", right: 12, bottom: 12, background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: "6px 10px", fontSize: 12 }}>
              Simulation: {running ? "RUNNING" : "STOPPED"}
            </div>
          </div>

          {view === "code" && (
            <div style={{ width: 420, borderLeft: "1px solid #ddd", padding: 12, background: "#fff" }}>
              <h3 style={{ marginTop: 0 }}>Generated Arduino Code</h3>
              <pre style={{ whiteSpace: "pre-wrap", background: "#fff", color: "#111", border: "1px solid #ddd", padding: 12, borderRadius: 10, minHeight: 200 }}>
                {generateArduinoCode({ ledPin: circuit.ledPin, buttonPin: circuit.buttonPin })}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

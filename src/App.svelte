<script>
  import P5 from "p5-svelte";

  import Slider from "@smui/slider";
  import Button from "@smui/button";
  import LayoutGrid, { Cell } from "@smui/layout-grid";

  let move_threshold = 5;
  let move_forward_threshold = 1;

  let permissionGranted = false;

  let lastDebounceTime = 0;
  let debounceDelay = 50;

  const sketch = (p5) => {
    p5.setup = () => {
      p5.createCanvas(p5.windowWidth, p5.windowHeight);
      p5.background(255);
      p5.textSize(48);

      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        // @ts-ignore
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        // ios 13 device

        // @ts-ignore
        DeviceOrientationEvent.requestPermission()
          .catch(() => {
            // show permission dialog only the first time
            let button = p5.createButton("click to allow access to sensors");
            button.style("font-size", "24px");
            button.center();
            button.mousePressed(requestAccess);
            throw Error("try again");
          })
          .then((e) => {
            // on any subsequent visits
            permissionGranted = true;
          });
      } else {
        // non ios 13 device
        p5.textSize(48);
        // text("non ios 13 device", 100, 100);
        permissionGranted = true;
      }
    };

    function requestAccess() {
      // @ts-ignore
      DeviceOrientationEvent.requestPermission()
        .then((response, event) => {
          if (response == "granted") {
            permissionGranted = true;

            deviceData = event;
          } else {
            permissionGranted = false;
          }
        })
        .catch(console.error);

      this.remove();
    }

    p5.draw = () => {
      if (!permissionGranted) return;

      p5.background(255);

      // TODO: debounce so it happens only once for each step
      // TODO: count frequency of steps
      if (
        Math.abs(p5.accelerationZ - p5.pAccelerationZ) > move_threshold &&
        Math.abs(p5.accelerationY - p5.pAccelerationY) > move_forward_threshold
      ) {
        if (Date.now() - lastDebounceTime > debounceDelay) {
          p5.stroke("red");
          p5.text("stepped", 100, 300);
        }
      } else {
        lastDebounceTime = Date.now();
      }
    };
  };
</script>

<!-- Last Debounce: {lastDebounceTime} -->

<LayoutGrid>
  <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={debounceDelay}
      min={45}
      max={100}
    />

    Value: {debounceDelay}
  </Cell>

  <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={move_threshold}
      min={1}
      max={10}
    />

    Value: {move_threshold}
  </Cell>

  <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={move_forward_threshold}
      min={0}
      max={1}
      step={0.001}
      input$aria-label="Continuous slider"
    />

    Value: {move_forward_threshold}
  </Cell>

  <Cell><P5 {sketch} /></Cell>
</LayoutGrid>

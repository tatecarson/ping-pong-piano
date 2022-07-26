<script>
  import P5 from "p5-svelte";

  import Slider from "@smui/slider";
  import Button from "@smui/button";
  import LayoutGrid, { Cell } from "@smui/layout-grid";

  import Chart from "svelte-frappe-charts";

  import VConsole from "vconsole";

  const vConsole = new VConsole();

  let move_threshold = 0.064;
  let move_forward_threshold = 0.1;

  let permissionGranted = false;

  let lastDebounceTime = 0;
  let debounceDelay = 145;

  let accelerationZ;
  let accelerationY;

  let steps = [];

  let stepping = false;

  let difference;

  let averageStepSpeed;

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
          } else {
            permissionGranted = false;
          }
        })
        .catch(console.error);

      this.remove();
    }

    p5.draw = () => {
      if (!permissionGranted) return;

      // console.log(DeviceMotionEvent.interval);

      p5.background(255);
      p5.fill(0);

      accelerationZ = p5.accelerationZ.toFixed(2);
      accelerationY = p5.accelerationY.toFixed(2);

      // p5.text(`Forward: ${accelerationY}`, 0, 100);
      // p5.text(`Up/Down: ${accelerationZ}`, 0, 200);

      // TODO: count frequency of steps
      if (
        Math.abs(p5.accelerationZ - p5.pAccelerationZ) > move_threshold &&
        Math.abs(p5.accelerationY - p5.pAccelerationY) > move_forward_threshold
      ) {
        if (Date.now() - lastDebounceTime > debounceDelay) {
          // Get the current time of each event
          // store the previous 10 in an array
          // get the difference between the time of each event and average it
          // print if the walker is going fast, medium, or slow

          p5.fill("red");
          p5.textSize(40);
          p5.text("stepped", 100, 300);

          // if we detect a step add its current time to an array
          if (stepping) {
            steps.push(Date.now());

            // if a step was detected don't allow another until debounce time is reached
            stepping = false;
          }

          // if the array gets too long clear it
          if (steps.length > 10) {
            steps = [];
          }

          // console.log(`Length: ${steps.length} Steps: ${steps}`);
          // console.log(`Diff: ${diff(steps)}`);

          // get the difference between the time of each step
          difference = diff(steps);

          // if we have at least 5 steps in the array then average the time differneces to get an average speed
          if (steps.length > 5) {
            // console.log(average(difference));
            averageStepSpeed = average(difference);

            // TODO: figure out what the ranges are that make sense
            if (averageStepSpeed) {
              if (averageStepSpeed < 350) {
                console.log("moving very quickly");
              } else if (averageStepSpeed > 350 && averageStepSpeed < 799) {
                console.log("moving medium speed");
              } else if (averageStepSpeed > 800) {
                console.log("moving quickly");
              }
            }
          }
        }
      } else {
        lastDebounceTime = Date.now();
        stepping = true;
      }

      // console.log(average(difference));
    };
  };

  function diff(A) {
    return A.slice(1).map(function (n, i) {
      return n - A[i];
    });
  }
  function average(arr) {
    const sum = arr.reduce((a, b) => a + b, 0);
    const avg = sum / arr.length || 0;

    return avg;
  }
</script>

<!-- <Chart {data} type="line" /> -->

<LayoutGrid>
  <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={debounceDelay}
      min={100}
      max={400}
    />

    Debounce delay: {debounceDelay}
  </Cell>

  <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={move_threshold}
      min={0}
      max={0.5}
      step={0.001}
    />

    up/down threshold: {move_threshold}
  </Cell>

  <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={move_forward_threshold}
      min={0}
      max={0.5}
      step={0.001}
      input$aria-label="Continuous slider"
    />

    Forward threshold: {move_forward_threshold}
  </Cell>

  <!-- <Cell>Forward: {accelerationY}</Cell>
  <Cell>Up/Down: {accelerationZ}</Cell> -->
  <Cell><P5 {sketch} /></Cell>
</LayoutGrid>

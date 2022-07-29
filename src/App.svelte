<script>
  import P5 from "p5-svelte";

  import Slider from "@smui/slider";
  import Button from "@smui/button";
  import LayoutGrid, { Cell } from "@smui/layout-grid";

  import Chart from "svelte-frappe-charts";

  import VConsole from "vconsole";

  import { std, mean, subtract } from "mathjs";

  const vConsole = new VConsole();

  let data = {
    labels: [], // x axis -  current time
    datasets: [
      { name: "MagNog", values: [] }, // y axiz - acc value m/s^2
      { name: "Std", values: [] },
    ],

    yMarkers: [{ label: "threshold", value: 8 }],
  };

  let chartRef;

  let move_threshold = 2;
  let move_forward_threshold = 0.1;

  // detect steps with p5 or not
  let detectStepsp5 = false;

  let showButton = false;
  let permissionGranted = false;

  let lastDebounceTime = 0;
  let debounceDelay = 145;

  let accelerationZ;
  let accelerationY;

  let steps = [];

  let stepping = false;

  let difference;

  let averageStepSpeed;

  let magArr = [];

  const sketch = (p5) => {
    p5.setup = () => {
      p5.createCanvas(p5.windowWidth, p5.windowHeight);
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
            // let button = p5.createButton("click to allow access to sensors");
            // button.style("font-size", "24px");
            // button.center();
            // button.mousePressed(requestAccess);

            showButton = true;
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

    p5.draw = () => {
      if (!permissionGranted) return;

      p5.background(255);

      // source: https://www.mathworks.com/help/matlabmobile_android/ug/counting-steps-by-capturing-acceleration-data.html
      let v = p5.createVector(
        p5.accelerationX,
        p5.accelerationY,
        p5.accelerationZ
      );

      let mag = v.mag();

      magArr.push(mag);

      // limit to 50 items
      if (magArr.length > 50) magArr.shift();

      // get the zero mean of the previous 50 values
      let magNoG = subtract(magArr, mean(magArr));

      let meanPeakHeight = std(magNoG);

      data.yMarkers[0].value = meanPeakHeight + move_threshold;

      if (magNoG[49] > meanPeakHeight + move_threshold) {
        // console.log(`Step ${magNoG} ${meanPeakHeight}`);
        console.log("Step");
        p5.background("red");

        steps.push(Date.now());

        if (steps.length > 10) {
          steps.shift();
        }
        // get the difference between the time of each step
        // remove times that are too long or too short
        difference = diff(steps).filter((value) => value > 200 && value < 5000);

        if (difference.length > 2) {
          console.log(difference);
          // console.log(`Recent step ${difference[difference.length - 1]}`);

          averageStepSpeed = mean(difference);
          // console.log(`Avg speed: ${averageStepSpeed}`);
        }
      }

      // rect shows how fast you're walking
      let y = p5.map(averageStepSpeed, 0, 3000, 0, p5.windowHeight) ?? 10;
      // console.log("🚀 ~ file: App.svelte ~ line 159 ~ sketch ~ height", y);

      p5.fill("green");
      p5.rect(0, y, p5.windowWidth, 20);

      // plotting the chart
      let now = new Date();
      chartRef.addDataPoint(now.getSeconds(), [magNoG[49], meanPeakHeight]);

      if (p5.frameCount > 20) {
        chartRef.removeDataPoint(0);
      }
    };
  };

  function diff(A) {
    return A.slice(1).map(function (n, i) {
      return n - A[i];
    });
  }

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
</script>

<LayoutGrid id="context">
  {#if permissionGranted}
    <Chart {data} type="line" bind:this={chartRef} />
  {:else}
    <!-- <Button on:click={requestAccess}>Allow sensors</Button> -->
  {/if}

  {#if showButton}
    <Button on:click={requestAccess}>Allow sensors</Button>
  {/if}

  <!-- <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={debounceDelay}
      min={100}
      max={400}
    />

    Debounce delay: {debounceDelay}
  </Cell> -->

  <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={move_threshold}
      min={1}
      max={6}
      step={1}
    />

    up/down threshold: {move_threshold}
  </Cell>

  <!-- <Cell>
    <Slider
      style="flex-grow: 1;"
      bind:value={move_forward_threshold}
      min={0}
      max={0.5}
      step={0.001}
      input$aria-label="Continuous slider"
    />

    Forward threshold: {move_forward_threshold}
  </Cell> -->

  <!-- <Cell>Forward: {accelerationY}</Cell>
  <Cell>Up/Down: {accelerationZ}</Cell> -->
  <!-- <Cell /> -->
</LayoutGrid>

<P5 {sketch} />

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

  let move_threshold = 1;
  let move_forward_threshold = 0.1;

  // detect steps with p5 or not
  let detectStepsp5 = false;

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

      // TODO: use this to figure out if the steps are going over
      data.yMarkers[0].value = meanPeakHeight + move_threshold;

      // TODO: play with the threshold value here
      if (magNoG[49] > meanPeakHeight + move_threshold) {
        // console.log(`Step ${magNoG} ${meanPeakHeight}`);
        console.log("Step");
      }
      // plotting the chart
      let now = new Date();
      chartRef.addDataPoint(now.getSeconds(), [magNoG[49], meanPeakHeight]);

      if (p5.frameCount > 20) {
        chartRef.removeDataPoint(0);
      }

      //   accelerationZ = p5.accelerationZ.toFixed(2);
      //   accelerationY = p5.accelerationY.toFixed(2);

      //   if (
      //     Math.abs(p5.accelerationZ - p5.pAccelerationZ) > move_threshold &&
      //     Math.abs(p5.accelerationY - p5.pAccelerationY) >
      //       move_forward_threshold &&
      //     detectStepsp5
      //   ) {
      //     if (Date.now() - lastDebounceTime > debounceDelay) {
      //       p5.fill("red");
      //       p5.textSize(40);
      //       p5.text("stepping", 100, 100);

      //       // if we detect a step add its current time to an array
      //       if (stepping) {
      //         steps.push(Date.now());

      //         // if a step was detected don't allow another until debounce time is reached
      //         stepping = false;

      //         // get the difference between the time of each step
      //         // remove times that are too long or too short
      //         difference = diff(steps).filter(
      //           (value) => value > 200 && value < 5000
      //         );

      //         // if we have at least 5 steps in the array then average the time diff to get an average speed

      //         // TODO: do some more testing to make sure it isn't picking up double triggers
      //         // also figure out why it skips some steps
      //         if (steps.length > 5) {
      //           console.log(difference);
      //           console.log(`Recent step ${difference[difference.length - 1]}`);
      //           averageStepSpeed = average(difference);

      //           // lighter colors for slower speed
      //           if (averageStepSpeed) {
      //             console.log(`Avg speed: ${averageStepSpeed}`);
      //             if (averageStepSpeed < 750) {
      //               p5.background("#0000AD");
      //             } else if (averageStepSpeed > 750 && averageStepSpeed < 1000) {
      //               p5.background("#1D9AFF");
      //             } else if (averageStepSpeed > 1000) {
      //               p5.background("#33C1FF");
      //             } else if (averageStepSpeed > 2000) {
      //               p5.background("#D1FFE0");
      //             }
      //           }
      //         }
      //       }

      //       // make sure array is always 10 units long
      //       if (steps.length > 10) {
      //         steps.shift();
      //       }
      //     }
      //   } else {
      //     lastDebounceTime = Date.now();
      //     p5.background(255);
      //     stepping = true;
      //   }
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

{#if permissionGranted}
  <Chart {data} type="line" bind:this={chartRef} />
{/if}

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
      min={1}
      max={6}
      step={1}
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

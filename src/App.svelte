<script>
  import P5 from "p5-svelte";
  import Slider from "@smui/slider";
  import Button from "@smui/button";
  import LayoutGrid, { Cell } from "@smui/layout-grid";
  import Chart from "svelte-frappe-charts";
  import * as Tone from "tone";
  import { std, mean, subtract } from "mathjs";
  import { svelteStore, doc, awareness } from "./lib/store.js";
  import VConsole from "vconsole";

  const vConsole = new VConsole();

  // plotting
  let data = {
    labels: [], // x axis -  current time
    datasets: [
      { name: "MagNog", values: [] }, // y axiz - acc value m/s^2
      { name: "Std", values: [] },
    ],

    yMarkers: [{ label: "threshold", value: 8 }],
  };

  let chartRef;

  // step counting
  let move_threshold = 2;

  let showButton = false;
  let permissionGranted = false;

  let steps = [];

  let difference;

  let averageStepSpeed;

  let magArr = [];

  // Tonejs vars
  let start = false;

  // syncstore
  let updatedPosition;

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

            // just to get the button to show up
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
      if (chartRef) {
        let now = new Date();
        chartRef.addDataPoint(now.getSeconds(), [magNoG[49], meanPeakHeight]);

        if (p5.frameCount > 20) {
          chartRef.removeDataPoint(0);
        }
      }

      // if the length of the array changes, update the transport position
    };
  };

  function diff(A) {
    return A.slice(1).map(function (n, i) {
      return n - A[i];
    });
  }

  awareness.on("change", (changes) => {
    // console.log(
    //   Array.from(awareness.getStates().values())[0].transport.position
    // );

    Tone.Transport.position = Array.from(
      awareness.getStates().values()
    )[0].transport.position;
  });

  function onAllowAudio() {
    Tone.context.resume();
    Tone.Transport.start();

    awareness.setLocalStateField("transport", {
      position: Tone.Transport.position,
    });
    start = true;
  }

  const synth = new Tone.Synth().toDestination();
  const seq = new Tone.Sequence(
    (time, note) => {
      synth.triggerAttackRelease(note, 0.1, time);
    },
    ["C4", ["E4", "D4", "E4"], "G4", ["A4", "G4"]]
  );

  /* @arr array you want to listen to
   @callback function that will be called on any change inside array
 */

  function startSeq() {
    // when a client starts add their position to an array
    if (updatedPosition) {
      // console.log(
      //   Array.from(awareness.getStates().values())[0].transport.position
      // );

      awareness.setLocalStateField("transport", {
        position: Tone.Transport.position,
      });
    }

    seq.start();
  }

  function stopSeq() {
    // awareness.setLocalStateField("transport", {
    //   position: Tone.Transport.position,
    // });
    seq.stop();
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
  <!-- Allow audio -->
  {#if !start}
    <Button on:click={onAllowAudio}>Allow Audio?</Button>
  {:else}
    <Button on:click={startSeq}>Play Seq</Button>
    <Button on:click={stopSeq}>Stop Seq</Button>

    <pre>{JSON.stringify($svelteStore, undefined, 2)}</pre>

    <!-- {$svelteStore.transport.position} -->
    <!-- {$svelteStore.transport.started} -->
  {/if}

  <!-- Allow accelerometer -->
  {#if showButton}
    <Button on:click={requestAccess}>Allow sensors</Button>
  {:else}
    <!-- <Chart {data} type="line" bind:this={chartRef} /> -->
  {/if}

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
</LayoutGrid>

<P5 {sketch} />

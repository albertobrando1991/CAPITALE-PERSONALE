import { PomodoroTimer } from "../PomodoroTimer";

export default function PomodoroTimerExample() {
  return (
    <PomodoroTimer
      workDuration={25}
      breakDuration={5}
      onComplete={(type) => console.log("Timer completed:", type)}
    />
  );
}

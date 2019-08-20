// Create an observable of numbers emitted from a DOM range input
import { fromEvent, Observable } from "rxjs";
import { map, startWith } from "rxjs/operators";

export const observeRange = (
  selector: string,
  initialValue = 0
): Observable<number> =>
  fromEvent(document.querySelector(selector), "input").pipe(
    map((e: Event) => parseInt((<HTMLInputElement>e.target).value)),
    startWith(initialValue)
  );

// Create an observable of waveform from DOM radio buttons
export const observeRadios = (
  inputName: string,
  initialValue: any
): Observable<any> =>
  fromEvent(
    document.querySelectorAll(`input[name="${inputName}"]`),
    "change"
  ).pipe(
    map((radioEvent: Event) => (<HTMLInputElement>radioEvent.target).value),
    startWith(initialValue)
  );

export const observeCheckbox = (
  selector: string,
  initialValue: boolean = false
) =>
  fromEvent(document.querySelector(selector), "change").pipe(
    map((checkbox: Event) => (<HTMLInputElement>checkbox.target).checked),
    startWith(initialValue)
  );

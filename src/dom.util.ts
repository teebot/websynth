// Create an observable of numbers emitted from a DOM range input
import { Observable } from 'rxjs/Observable';

export const observeRange = (selector: string, initialValue = 0): Observable<number> =>
    Observable.fromEvent(document.querySelector(selector), 'input')
        .map((e: Event) => parseInt((<HTMLInputElement>e.target).value))
        .startWith(initialValue);

// Create an observable of waveform from DOM radio buttons
export const observeRadios = (inputName: string, initialValue: any): Observable<any> =>
    Observable.fromEvent(document.querySelectorAll(`input[name="${inputName}"]`), 'change')
        .map((radioEvent: Event) => (<HTMLInputElement>radioEvent.target).value)
        .startWith(initialValue);

export const observeCheckbox = (selector: string, initialValue: boolean = false) =>
    Observable.fromEvent(document.querySelector(selector), 'change')
        .map((checkbox: Event) => (<HTMLInputElement>checkbox.target).checked)
        .startWith(initialValue);
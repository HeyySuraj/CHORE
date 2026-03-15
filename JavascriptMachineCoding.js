const A = [121, 2, 3, 4, 5, 6, 7, 8, 9, 10];


// function maxDifference(arr) {
//     let res = 0, min = arr[0];
//     for (const element of arr) {
//         diff = element - min;
//         min = Math.min(min, element);
//         res = Math.max(diff, res);
//     }
//     console.log(res, '===========');

// }

function maxDifference(arr) {
    let min = arr[0]
    let maxDiff = 0;

    for (let i = 1; i < arr.length; i++) {
        const diff = arr[i] - min;
        maxDiff = Math.max(maxDiff, diff);
        min = Math.min(min, arr[i]);
    }
    console.log(maxDiff, '===========');

    return maxDiff;
}

console.log(maxDifference([1, 2, 90, 10, 110]));
maxDifference(A);




// You are free to use alternative approaches of
// instantiating the EventEmitter as long as the
// default export has the same interface.

export default class EventEmitter {
    constructor() {
        this.__event_emitter = Object.create(null)
        // throw 'Not implemented!';
    }

    /**
     * @param {string} eaventName
     * @param {Function} listener
     * @returns {EventEmitter}
     */
    on(eventName, listener) {
        if (!this.__event_emitter[eventName]) {
            this.__event_emitter[eventName] = [];
        }
        this.__event_emitter[eventName].push(listener);

        return this;


    }

    /**
     * @param {string} eventName
     * @param {Function} listener
     * @returns {EventEmitter}
     */
    off(eventName, listener) {
        if (!this.__event_emitter[eventName]) {
            return this
        }
        // const index = this.__event_emitter[eventName].indexOf(listener);
        const index = this.__event_emitter[eventName].findIndex(
            (listenerItem) => listenerItem === listener,
        );
        if (index < 0) return this
        this.__event_emitter[eventName].splice(index, 1);
        return this;

    }

    /**
     * @param {string} eventName
     * @param  {...any} args
     * @returns {boolean}
     */
    emit(eventName, ...args) {
        if (!this.__event_emitter[eventName] || this.__event_emitter[eventName].length === 0) return false;
        const methods = this.__event_emitter[eventName];
        for (const fn of methods) {
            fn(...args)
        }
        return true;
    }
}


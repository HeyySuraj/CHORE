


const A = [24,2, 242, 232, 5222, 54, 757, 57, 4744, 463]


// try {
    
//     console.log(bubbleSort(A));
// } catch (error) {
//     console.log(error)   
// }

/**
 * Sorting will be done from last element
 * In Place, Travers from starting in inner loop find a[j] > a[j+1] then swap, 
 * @param {array} a 
 * @returns 
 */
function bubbleSort(a) {

    for (let i = a.length - 1; i <= 0; i--) {
        for (let j = 0; j < i; j++) {
            if (a[j] > a[j + 1]) {
                const temp = a[j];
                a[j] = a[j + 1];
                a[j + 1] = temp;
            }
        }
    }

    return a;
}

/**
 * Like we play cards if we find smallest insert it in its correct position
 * for loop from start key = a[i] and while loop while a[j] > key
 * @param {*} a 
 * @returns 
 */
function insertionSort(a) {

    for (let i = 1; i < A.length; i++) {

        const key = a[i];
        let j = i - 1;

        while (j > 0 && a[j] > key) {
            a[j + 1] = a[j]
            j--;
        }
        a[j + 1] = key;
    }

    return A;
}


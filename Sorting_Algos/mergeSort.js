

// MERGE SORT 
// STEP 1. write function to add to sorted arrays in single sorted array; while loop; pick one add and in result 
// STEP 2. write merge function recursively to divide (find mid = n/2) arrays until length = 1 (return if length = 1) [34, 2]


function mergeSort(arr) {
    if (arr.length === 1) return arr;

    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));

    return merge(left, right);
}

/**
 * 
 * @param {[number]} left 
 * @param {[number]} right 
 */
function merge(left = [], right = []) {

    let result = [];
    let i = 0, j = 0;

    while (i < left.length && j < right.length) {
        if (left[i] < right[j]) {
            result.push(left[i++]);
        } else {
            result.push(right[j++])
        }
    }

    return result.concat(left.slice(i), right.slice(j));
}

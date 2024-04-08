// Seeded PCG RNG
// Anything that calls RNG should have its own instance of this class, for determinism purposes (javascript is synchronous)

// Values and code references from the wikipedia page on PCG
// https://en.wikipedia.org/w/index.php?title=Permuted_congruential_generator&oldid=1204900506
// PCG originally created by Melissa E. O'Neill and described in PCG: A Family of Simple Fast Space-Efficient Statistically Good Algorithms for Random Number Generation
// This implementation in javascript written by me

// Write a function that takes a probability distribution and returns a number (or anything) based on it
export default class RNG {
	constructor(state = 0x4d595df4d0f33173n, multiplier = 6364136223846793005n, increment = 1442695040888963407n) {
		this.state = state;
		this.multiplier = multiplier;
		this.increment = increment;
	}

	// Use this to pad/truncate x
	// Necessary to emulate the behavior of fixed-bitlength numbers
	#pad_or_truncate(x, bits = 64) {
		let binary = (x).toString(2)
		if (binary.length <= bits) {
			return ('0b' + '0'.repeat(bits - binary.length) + binary);
		} else {
			return ('0b' + binary.slice(-bits));
		}
	}

	#rotr32(x, r) {
		return (x >> r | x << (-r & 31n)) & 4294967295n;
	}

	call() {
		let x = this.state;
		this.state = BigInt(this.#pad_or_truncate((this.state * this.multiplier + this.increment)));
		let count = x >> 59n;
		x = ((x ^ (x >> 18n)) >> 27n) & 4294967295n;
		return Number(this.#rotr32(x, count));
	}

	init(seed = 0n) {
		this.state = BigInt(seed) + this.increment;
		this.call();
	}

	// Uniformly distributed random integers
	// Rolls values from min to max-1 (zero indexing compatibility)
	randint(min, max) {
		if (max) {
			return this.call()%(max - min) + min;
		} else if (min) {
			return min > 0 ? this.call()%min : this.call()%(-min) + min;
		} else {
			return this.call();
		}
	}

	// Uniformly distributed random 32 bit float
	// Although javascript uses 64 bit numbers, the PCG above only outputs 32 bits
	// Good enough for a video game though
	rand(min, max) {
		if (max) {
			return this.call()*(2**-32)*(max - min) + min;
		} else if (min) {
			return this.call()*(2**-32)*min;
		} else {
			return this.call()*(2**-32);
		}
	}

	// Random permutation of an array
	// Returns a random permutation of integers up to the input when given a number
	// Returns a random permutation of the elements of the array when given an array
	// Does not affect the input array
	randperm(array) {
		let newArray = [];
		let oldArray;
		if (!(array instanceof Array) && typeof array == "number") {
			oldArray = Array.from(Array(array), (_, i) => i);
		} else {
			oldArray = [...array];
		}
		while (oldArray.length > 1) {
			newArray.push(oldArray.splice(this.randint(oldArray.length), 1)[0]);
		}
		newArray.push(oldArray.shift());
		return newArray;
	}

	// Permutes the input array in place
	permute(array) {
		let oldArray = [];
		while (array.length > 1) {
			oldArray.push(array.splice(this.randint(array.length), 1)[0]);
		}
		while (oldArray.length > 0) {
			array.unshift(oldArray.pop());
		}
	}

	// Take an array of probabilities (doesn't need to add to one, probably best for it to, but cannot be zero) and spit out an index or an element of optional items array with that distribution
	choose(probabilities, array) {
		let items = array;
		if (items == undefined) {
			items = probabilities.map((_, i) => i);
		} else if (probabilities.length !== items.length) {
			throw RangeError(`Item array and probability array must have the same length! If you want an out-of-bounds index, do not pass items array, and treat the result accordingly. If you want to limit the indices, add zeros to the probability array. items.length: ${items.length}, probabilities.length: ${probabilities.length}`);
		}
		let normalizer = probabilities.reduce((x, e) => x + e);
		// find a random number between 0 and the sum of the probability array
		let number = this.rand(normalizer);
		// Map the probability masses to the cumulative probabilities and then find the first index such that our random number is less than the cumulative at that index
		return items[probabilities.map((e, i) => p.slice(0, i + 1).reduce((x, e) => x + e)).findIndex(e => number < e)];
	}
}

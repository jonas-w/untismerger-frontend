if (!localStorage.getItem('jwt')) {
	window.location.href = '/setup';
}
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js');
}

const colorEnum = {
	'Physik': 'teal',
	'Informationstechnik': 'grey',
	'Englisch': 'red',
	'Ethik': 'green',
	'Sport': 'lightblue',
	'Praktische Informatik': 'orange',
	'Mathematik': 'azure',
	'Deutsch': 'lightgrey',
	'Geschichte': 'blueViolet',
	'Politik und Wirtschaft': 'lightgreen'
};

const startTimeEnum = Object.freeze({
	800: 0,
	945: 1,
	1130: 2,
	1330: 3,
	1515: 4
});
const weekDayEnum = {
	0: 'Montag',
	1: 'Dienstag',
	2: 'Mittwoch',
	3: 'Donnerstag',
	4: 'Freitag'
};
const indexDayEnum = {
	Montag: 0,
	Dienstag: 1,
	Mittwoch: 2,
	Donnerstag: 3,
	Freitag: 4
};

let currentDay = new Date();

var timeTable = JSON.parse(localStorage.getItem('timeTable')) || {};
/**
 *
 * @param {Date} date
 * @returns {string[]}
 */
function getWeekFromDay(date) {
	let week = [];

	for (let i = 1; i <= 5; i++) {
		let first = date.getDate() - date.getDay() + i;
		let day = new Date(date.setDate(first)).toISOString().slice(0, 10);
		week.push(day);
	}
	return week;
}

/**
 *
 * @param {string} date
 * @param {number} index
 * @returns {Promise<number>} Number of element Added
 */
async function addDay(date, index) {
	return new Promise((resolve, reject) => {
		const variableContent = document.getElementById('variableContent');
		let day = document.createElement('div');
		day.setAttribute('class', 'day');
		let firstRow = document.createElement('div');
		firstRow.setAttribute('class', 'row');
		firstRow.innerHTML = weekDayEnum[index];
		day.appendChild(firstRow);

		for (let i = 0; i < 5; i++) {
			let row = document.createElement('div');
			row.setAttribute('class', 'row');
			timeTable[date].forEach((element) => {
				if (element['stunde'] === i) {
					row.classList.add('stunde');
					row.innerHTML = `<p>${element['fach']}<p>
                <p>${element['raum']} - ${element['lehrer']}</p>
                `;
					if (element['code'] === 'cancelled') {
						row.classList.add('cancelled');
					}
					row.style.backgroundColor = colorEnum[element['fach']];
				}
			});

			day.appendChild(row);
		}
		variableContent.appendChild(day);
		if (variableContent.childElementCount === 5) {
			let itemArr = [];
			let items = variableContent.children;
			for (let i = 0; i < items.length; i++) {
				itemArr.push(items[i]);
			}
			itemArr.sort((a, b) => {
				let ab = indexDayEnum[a.children[0].innerHTML];
				let ba = indexDayEnum[b.children[0].innerHTML];
				return ab - ba;
			});
			variableContent.innerHTML = '';
			for (let i = 0; i < itemArr.length; ++i) {
				variableContent.appendChild(itemArr[i]);
			}
		}

		resolve(variableContent.childElementCount);
	});
}

/**
 *
 * @param {string} datum
 * @returns {Promise<void>}
 */
async function getDay(datum) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.addEventListener('load', () => {
			if (!(xhr.status === 200)) {
				reject(xhr.response);
				return;
			}

			var data = JSON.parse(xhr.response);

			for (var i = 0; i < data.length; i++) {
				const first = data[i]['fach'];
				const second = data[i + 1]['fach'];
				if (first === second) {
					data.splice(i + 1, 1);
				}
			}

			// sort data
			var arr = [null, null, null, null, null];
			for (var i = 0; i < data.length; i++) {
				const startZeit = data[i]['startZeit'];
				const stunde = startTimeEnum[startZeit];
				arr[stunde] = data[i];
			}

			data.forEach((element) => {
				element['stunde'] = startTimeEnum[element['startZeit']];
				delete element['startZeit'];
			});

			timeTable[datum] = data;
			resolve();
		});
		xhr.open('POST', '/getTimeTable');
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.send(`jwt=${localStorage.getItem('jwt')}&datum=${datum}`);
	});
}

/**
 * @param {boolean} purge Should the cache be purged
 * @param {Date} date Optional Date to display, defaults to Current week
 * @returns {Promise<void>}
 */
async function displayWeek(purge, date) {
	return new Promise((resolve, reject) => {
		let weekDisplay = document.getElementById('weekDisplay');
		let week = getWeekFromDay(date);
		let firstDay = week[0].split('-');
		let lastDay = week[4].split('-');

		weekDisplay.innerHTML = `${firstDay[2]}.${firstDay[1]} - ${lastDay[2]}.${lastDay[1]}`;
		document.getElementById('variableContent').innerHTML = '';
		if (purge) {
			for (let i = 0; i < 5; i++) {
				getDay(week[i])
					.then(() => {
						addDay(week[i], i).then((childCount) => {
							if (childCount === 5) {
								resolve();
								localStorage.setItem('timeTable', JSON.stringify(timeTable));
							}
						});
					})
					.catch(console.log);
			}
			for (const [key, value] of Object.entries(timeTable)) {
				if (new Date().getTime() > Date.parse(key)) {
					delete timeTable[key];
				}
			}
			localStorage.setItem('timeTable', JSON.stringify(timeTable));
		} else {
			for (let i = 0; i < 5; i++) {
				if (timeTable[week[i]]) {
					addDay(week[i], i).then((childCount) => {
						if (childCount === 5) {
							resolve();
							localStorage.setItem('timeTable', JSON.stringify(timeTable));
						}
					});
				} else {
					getDay(week[i])
						.then(() => {
							addDay(week[i], i).then((childCount) => {
								if (childCount === 5) {
									resolve();
									localStorage.setItem('timeTable', JSON.stringify(timeTable));
								}
							});
						})
						.catch(console.log);
				}
			}
		}
	});
}

displayWeek(false, currentDay);

let _startY;
let _startX;
const body = document.body;

body.addEventListener(
	'touchstart',
	(e) => {
		_startY = e.touches[0].pageY;
		_startX = e.touches[0].pageX;
	},
	{ passive: true }
);

body.addEventListener(
	'touchmove',
	async (e) => {
		const y = e.touches[0].pageY;
		if (document.scrollingElement.scrollTop === 0 && y > _startY + 100) {
			refreshHandler();
		}
		const x = e.touches[0].pageX;
		if (document.scrollingElement.scrollLeft === 0 && x < _startX - 100) {
			scrollWeeks(true);
		}
		if (document.scrollingElement.scrollLeft === 0 && x > _startX + 100) {
			scrollWeeks(false);
		}
	},
	{ passive: true }
);

window.onkeydown = function (event) {
	switch (event.key) {
		case 'r': {
			refreshHandler();
			break;
		}
		case 'a': {
			scrollWeeks(false);
			break;
		}
		case 'd': {
			scrollWeeks(true);
			break;
		}
	}
};

function refreshHandler() {
	navigator.serviceWorker.ready.then((req) => {
		req.update();
	});

	if (body.classList.contains('refreshing')) {
		return;
	}
	if (!window.navigator.onLine) {
		body.classList.add('offline');
		setTimeout(() => {
			body.classList.remove('offline');
		}, 3000);
		return;
	}
	body.classList.add('refreshing');
	displayWeek(true, currentDay).then(() => {
		body.classList.remove('refreshing');
	});
}
/**
 * @param {boolean} boolIn true = +1 Week; false = -1 Week
 */
function scrollWeeks(boolIn) {
	if (body.classList.contains('switching')) {
		return;
	}
	body.classList.add('switching');
	let curr = currentDay.getTime();

	if (boolIn) {
		curr += 7 * 60 * 60 * 24 * 1000;
		currentDay = new Date(curr);
		displayWeek(false, currentDay);
	} else {
		curr -= 7 * 60 * 60 * 24 * 1000;

		if (curr < new Date().getTime()) {
			setTimeout(() => {
				body.classList.remove('switching');
			}, 5);
			return;
		}
		currentDay = new Date(curr);
		displayWeek(false, currentDay);
	}
	setTimeout(() => {
		body.classList.remove('switching');
	}, 5);
}

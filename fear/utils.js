
const MaxUint256 = ethers.constants.MaxUint256;
const getEpoch = (d) => Math.floor((d || new Date()).getTime() / 1000);
const hasMetamask = typeof _.get(window, "ethereum.request") == 'function';
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default

const formatEther = (bn, short = true) => {
  try {
    return ethers.utils
      .formatEther(short ? bn.div(1e14).mul(1e14) : bn)
      .replace(/\.0$/, "");
  } catch (err) {
    if (![null, undefined].includes(bn)) console.error(err);
    return "n/a";
  }
};

const formatWei = (bn) => {
  if (bn === null || bn === undefined) return "N/A";
  return bn.toString();
};

const monthMap = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad00 = (input) => {
  return input.toString().padStart(2, '0');
}
const formatDate = (epoch) => {
  let date = new Date(+epoch * 1000);
  return `${pad00(date.getDate())}${monthMap[date.getMonth()]} ${pad00(date.getHours())}:${pad00(date.getMinutes())}:${pad00(date.getSeconds())}`;
}
const getShortAddress = address => {
  try {
		return address.substr(0, 4) + ".." + address.substr(-4);
	}
	catch {
		return '';
	}
}

const notify = (message, type) => { // 'info' / 'success' / 'error'
  if(message == null || message == undefined) return window.vm.notification = null;
  window.vm.notification = {
    type,
    message,
  }
}
const notifyInfo = msg => notify(msg, 'info');
const notifyError = e => {
  if(e === null || e === undefined) return;
  if(e instanceof Error) console.error(e);
  const msg = _.get(e, "data.message") || _.get(e, "message") || e
  return notify(msg, 'error');
}
const notifySuccess = msg => notify(msg, 'success');

const countdownText = noOfSecs => {
  var d = Math.floor(noOfSecs / (60 * 60 * 24));
  var h = Math.floor((noOfSecs % (60 * 60 * 24)) / (60 * 60));
  var m = Math.floor((noOfSecs % (60 * 60)) / (60));
  var s = Math.floor((noOfSecs % (60)));
  return `${d > 0 ? `${d} days ` : ''}${pad00(h)}:${pad00(m)}:${pad00(s)}`
}

const metamaskSvg = `
<svg style="width: 1rem; height: 1rem" version="1.1" baseProfile="basic" id="Layer_1"
	 xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 33.9 31.3"
	 xml:space="preserve">
<path fill="#E17726" stroke="#E17726" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M32.1,0.1L18.9,9.8
	l2.4-5.7L32.1,0.1z"/>
<path fill="#E27625" stroke="#E27625" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M1.8,0.1l13,9.8
	l-2.3-5.8L1.8,0.1z"/>
<path fill="#E27625" stroke="#E27625" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M27.4,22.7L23.9,28
	l7.5,2.1l2.1-7.3L27.4,22.7z"/>
<path fill="#E27625" stroke="#E27625" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M0.4,22.8l2.1,7.3
	L10,28l-3.5-5.3L0.4,22.8z"/>
<path fill="#E27625" stroke="#E27625" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M9.6,13.6l-2.1,3.1
	l7.4,0.3l-0.2-8L9.6,13.6z"/>
<path fill="#E27625" stroke="#E27625" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M24.3,13.6l-5.2-4.6
	l-0.2,8.1l7.4-0.3L24.3,13.6z"/>
<path fill="#E27625" stroke="#E27625" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M10,28l4.5-2.2
	l-3.9-3L10,28z"/>
<path fill="#E27625" stroke="#E27625" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M19.4,25.8l4.5,2.2
	l-0.6-5.2L19.4,25.8z"/>
<path fill="#D5BFB2" stroke="#D5BFB2" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M23.9,28l-4.5-2.2
	l0.4,2.9l0,1.2L23.9,28z"/>
<path fill="#D5BFB2" stroke="#D5BFB2" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M10,28l4.2,2l0-1.2
	l0.4-2.9L10,28z"/>
<path fill="#233447" stroke="#233447" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M14.2,20.9l-3.7-1.1
	l2.6-1.2L14.2,20.9z"/>
<path fill="#233447" stroke="#233447" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M19.6,20.9l1.1-2.3
	l2.6,1.2L19.6,20.9z"/>
<path fill="#CC6228" stroke="#CC6228" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M10,28l0.6-5.3
	l-4.1,0.1L10,28z"/>
<path fill="#CC6228" stroke="#CC6228" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M23.2,22.7l0.6,5.3
	l3.5-5.2L23.2,22.7z"/>
<path fill="#CC6228" stroke="#CC6228" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M26.4,16.8l-7.4,0.3
	l0.7,3.8l1.1-2.3l2.6,1.2L26.4,16.8z"/>
<path fill="#CC6228" stroke="#CC6228" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M10.5,19.8l2.6-1.2
	l1.1,2.3l0.7-3.8l-7.4-0.3L10.5,19.8z"/>
<path fill="#E27525" stroke="#E27525" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M7.5,16.8l3.1,6.1
	l-0.1-3L7.5,16.8z"/>
<path fill="#E27525" stroke="#E27525" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M23.4,19.8l-0.1,3
	l3.1-6.1L23.4,19.8z"/>
<path fill="#E27525" stroke="#E27525" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M14.9,17.1l-0.7,3.8
	l0.9,4.5l0.2-5.9L14.9,17.1z"/>
<path fill="#E27525" stroke="#E27525" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M18.9,17.1l-0.4,2.4
	l0.2,5.9l0.9-4.5L18.9,17.1z"/>
<path fill="#F5841F" stroke="#F5841F" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M19.6,20.9l-0.9,4.5
	l0.6,0.4l3.9-3l0.1-3L19.6,20.9z"/>
<path fill="#F5841F" stroke="#F5841F" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M10.5,19.8l0.1,3
	l3.9,3l0.6-0.4l-0.9-4.5L10.5,19.8z"/>
<path fill="#C0AC9D" stroke="#C0AC9D" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M19.7,30l0-1.2
	l-0.3-0.3h-5l-0.3,0.3l0,1.2L10,28l1.5,1.2l2.9,2h5.1l3-2l1.4-1.2L19.7,30z"/>
<path fill="#161616" stroke="#161616" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M19.4,25.8l-0.6-0.4
	h-3.7l-0.6,0.4l-0.4,2.9l0.3-0.3h5l0.3,0.3L19.4,25.8z"/>
<path fill="#763E1A" stroke="#763E1A" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M32.6,10.5l1.1-5.4
	l-1.7-5L19.4,9.5l4.9,4.1l6.9,2l1.5-1.8L32,13.4l1.1-1l-0.8-0.6l1.1-0.8L32.6,10.5z"/>
<path fill="#763E1A" stroke="#763E1A" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M0.1,5.1l1.1,5.4
	L0.5,11l1.1,0.8l-0.8,0.6l1.1,1l-0.7,0.5l1.5,1.8l6.9-2l4.9-4.1L1.8,0.1L0.1,5.1z"/>
<path fill="#F5841F" stroke="#F5841F" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M31.2,15.6l-6.9-2
	l2.1,3.1l-3.1,6.1l4.1-0.1h6.1L31.2,15.6z"/>
<path fill="#F5841F" stroke="#F5841F" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M9.6,13.6l-6.9,2
	l-2.3,7.1h6.1l4.1,0.1l-3.1-6.1L9.6,13.6z"/>
<path fill="#F5841F" stroke="#F5841F" stroke-width="0.25" stroke-linecap="round" stroke-linejoin="round" d="M18.9,17.1l0.4-7.6
	l2-5.4h-8.9l2,5.4l0.4,7.6l0.2,2.4l0,5.9h3.7l0-5.9L18.9,17.1z"/>
</svg>
`

const ethSvg = `
<svg style="height: 2.5rem;display: block;" version="1.1"
	xmlns="http://www.w3.org/2000/svg"
	xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"
	y="0px" viewBox="0 0 1920 1920"
	enable-background="new 0 0 1920 1920"
	xml:space="preserve">
	<g>
		<polygon fill="#8A92B2"
			points="959.8,80.7 420.1,976.3 959.8,731 	" />
		<polygon fill="#62688F"
			points="959.8,731 420.1,976.3 959.8,1295.4 	" />
		<polygon fill="#62688F"
			points="1499.6,976.3 959.8,80.7 959.8,731 	" />
		<polygon fill="#454A75"
			points="959.8,1295.4 1499.6,976.3 959.8,731 	" />
		<polygon fill="#8A92B2"
			points="420.1,1078.7 959.8,1839.3 959.8,1397.6 	" />
		<polygon fill="#62688F"
			points="959.8,1397.6 959.8,1839.3 1499.9,1078.7 	" />
	</g>
</svg>
`

const balert = msg => {
	bootbox.alert({
		message: msg,
		closeButton: false,
		size: 'lg',
		centerVertical: true,
		className: 'dark-modal'
	});
}

const countdown = (epoch, target, print = false) => {
	let delta = target - epoch;
	if(delta < 0) delta = 0;
	const d = Math.floor( delta/86400 );
	const h = Math.floor( (delta - 86400*d) / 3600);
	const m = Math.floor( (delta - 86400*d - h*3600) / 60 );
	const s = delta - 86400*d - h*3600 - 60*m;
	if(print) {
		return `${d}d ${h}h ${m}m ${s}s`
		.replace(/^0d 0h 0m 0s/, '')
		.replace(/^0d 0h 0m /, '')
		.replace(/^0d 0h /, '')
		.replace(/^0d /, '')
	}
	return ({
		d: d,
		h: h,
		m: m,
		s: s,
	})
}

const getExceptionMsg = (ex) => {
	console.error(ex);
	const msg = _.get(ex, "error.message") || _.get(ex, "data.message") || _.get(ex, "message") || (typeof ex == "string" && ex) || (Object.hasOwn(ex, 'toString') ? ex.toString() : 'unknown exception');
	return msg;
	//.replace(/^execution reverted\: /i, '');
}

const scroll2Top = () => {
	document.documentElement.scrollTop = 0;
}

const ZeroBN = ethers.constants.Zero;

const getWeb3ActiveAddress = async (provider) => {
	try {
		const address = _.first(await provider.request({ method: 'eth_accounts' }));
		return ethers.utils.getAddress(address);
	}
	catch(e) {
		console.error(e);
		return undefined
	}
}

const getWeb3ActiveChainId = async (provider) => {
	try {
		return +(await provider.request({ method: 'eth_chainId' }));
	}
	catch(e) {
		console.error(e);
		return undefined;
	}
}

const decreaseBuyAmount = (min = 1) => {
	const vm = Alpine.store("vm");
	if(vm.buyAmount > min) {
		vm.buyAmount -= 1;
	}
}

const increaseBuyAmount = (max = 5) => {
	const vm = Alpine.store("vm");
	if(vm.buyAmount < max) {
		vm.buyAmount += 1;
	}
}
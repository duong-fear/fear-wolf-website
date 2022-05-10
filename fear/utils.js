
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

const changeAmount = (name, step) => {
	const vm = Alpine.store("vm");
	const min = 1;
	const maxPreSale = Math.min(5, vm.preSaleRemain, vm.preSaleLimit - vm.reserved);
	const maxPublicSale = Math.min(10, vm.publicSaleRemain);
	const max = _.get({
		"preSaleBuyAmount": maxPreSale,
		"publicSaleBuyAmount": maxPublicSale,
	}, name);
	let value = vm[name] + step;
	if(value < min) value = min;
	if(value > max) value = max;
	vm[name] = value;
}

const closeExistingWCSession = async () => {
	try {
		const config = localStorage.getItem("walletconnect");
		if(config == null || JSON.parse(config).connected !== true) return;
		const providerOptions = {
			walletconnect: {
				package: WalletConnectProvider,
				options: {
					infuraId: "9aa3d95b3bc440fa88ea12eaa4456161",
				}
			},
		};
		const web3Modal = new Web3Modal({
			cacheProvider: false,
			providerOptions,
			disableInjectedProvider: true,
		});
		const provider = await web3Modal.connectTo("walletconnect");
		if(provider.connected === true) {
			await provider.close();
		}
	}
	catch(error) {
		console.error("closeWCSession", error);
	}
	finally {
		localStorage.clear("walletconnect");
	}
}
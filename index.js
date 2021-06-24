// Load AIDOS API
var Aidos = aidos;

//globals
window.availableBalance = 0;
window.selectedInputTotal = 0;
window.selectedInputs = [];
window.nextRemainderAddress="";

var depth = 3; 
var minWeightMagnitude = 18;
var operationInProgress = false;
var loaderShown = false;

//Spinner
function loaderTimer() {
   if (operationInProgress && !loaderShown){
	   document.getElementById("loader").style.display="block";
	   loaderShown = true;
   }
   else if (!operationInProgress && loaderShown){
	   document.getElementById("loader").style.display="none";
	   loaderShown = false;
   }
}
setInterval(loaderTimer, 1000);

// Tools & Status updates
function setStatus(txt){
	document.getElementById("status").innerHTML = txt;
}

function bodyOnLoad(){
	setStatus("Page loaded.")
}

function formatADK(adkbal){
   return (adkbal/100000000.0).toFixed(8)+" ADK"
}

function isValidAZ9(str){
   if (str===undefined) return true; // undefined is also OK
   return !str.match('[^A-Z9]'); // false if string contains any characters beside A-Z9
}

// Get Node info 

function GetNodeInfo(){
	var aidos = new Aidos({'provider': document.getElementById("node").value});
	setStatus("Getting Node Info...");
	setTimeout(() => {
		aidos.api.getNodeInfo(function(error, success) {
			if (error) {
				console.error(error);
				alert((error));
				setStatus("Error on getNodeInfo. Check node address");
			} else {
				console.log(success);
				alert(JSON.stringify(success));
				setStatus("Node alive.");
			}
		})
	}
	,500);
}

// Scan for Addresses and get Balances

function ScanAddressesButton(){
	if (operationInProgress){ alert("Operation already in progress. please wait"); return; };
	operationInProgress = true;
	setStatus("Generating Addresses... please wait");
	window.inputs = [];
	setTimeout(() => {
		try{
		const addrList = document.getElementById("addrList");
		addrList.innerHTML = '';
		
		var aidos = new Aidos({'provider': document.getElementById("node").value});
		var options = {
			index: parseInt(document.getElementById("addressIndexStart").value),
			total: parseInt(document.getElementById("addressIndexEnd").value)+1-parseInt(document.getElementById("addressIndexStart").value),
			checksum: true
		};
		var seed = document.getElementById("seed").value;
		var addressValOnly = document.getElementById("addressValOnly").checked;
		
		aidos.api.getNewAddress(seed, options, function(error, addresses) {
			if (error) {
				alert(error);
				console.error(error)
				setStatus("Error generating addresses.");
				operationInProgress = false;
		
			} else {
				console.log(addresses)
				//alert(JSON.stringify(success));
				setStatus("Fetching balances from node... please wait");
				aidos.api.getBalances(addresses, 100, function(error, balance) {
						if (error) {
								alert(error);
								console.error(error)
								setStatus("Error getting address balances. Check if node alive.");
								operationInProgress = false;
						} else {
							   console.log(balance);
								var startindex = options.index;
								var totalbal = 0;
								window.nextRemainderAddress = "";
								for (var i = 0; i < addresses.length; i++) { 
									var bal = balance.balances[i];
									if (bal!="0") {
										window.nextRemainderAddress = "";
									} else if (window.nextRemainderAddress == "") {
										window.nextRemainderAddress = addresses[i];
									}
									totalbal += parseInt(bal);
									if ( !addressValOnly|| bal != "0"){
										const newTR = document.createElement("tr");
										const newTD1 = document.createElement("td");
										const newTD2 = document.createElement("td");
										const newTD3 = document.createElement("td");
										const newTD4 = document.createElement("td");
										newTR.appendChild(newTD1);
										newTR.appendChild(newTD2);
										newTR.appendChild(newTD3);
										newTR.appendChild(newTD4);
										newTD1.appendChild(document.createTextNode("Index "+(startindex+i)));
										newTD1.style.width="70px";
										newTD2.appendChild(document.createTextNode(addresses[i]));
										newTD2.style.fontSize="11px";
										if (parseInt(bal)==0) {
											newTD3.style.color="gray";
											newTD3.appendChild(document.createTextNode("0 ADK"))
										}
										else newTD3.appendChild(document.createTextNode(formatADK(parseInt(bal))))
										// checkbox
										var ch = document.createElement('INPUT');
										ch.type = "checkbox";
										ch.name = "chinput" + (startindex+i);
										ch.value = '{"address":"'+addresses[i].substring(0,81)+'", "balance":'+parseInt(bal)+',"keyIndex":'+(startindex+i)+'}';
										ch.class = "cb_class";
										ch.id = "chinput" + (startindex+i);
										ch.setAttribute("onchange","inputCheck();");
										newTD4.appendChild(ch);
										addrList.appendChild(newTR);
									}
								}
								setStatus("Fetching addresses complete. Total balance: "+formatADK(parseInt(totalbal)));
								window.availableBalance = parseInt(availableBalance);
								document.getElementById("remainderAddress").value=window.nextRemainderAddress;
								operationInProgress = false;
						}
				})
			}
		});
		}
		catch (err){
			operationInProgress = false;
			alert(err);
			console.log(err);
			setStatus("Error fetching addresses. Sis you enter a valid seed and start/end index range?");
		}
	}, 500);
}

// input-checkbox changes, update totals

function inputCheck(){
	var inputs = document.getElementsByTagName("INPUT");
	window.selectedInputTotal = 0;
	var cntInputsSelected = 0;
	window.selectedInputs = [];
	for (var i = 0; i < inputs.length; i++){
			if (inputs[i].type=="checkbox" && inputs[i].name.startsWith("chinput") && inputs[i].checked){
				var inputdata = JSON.parse(inputs[i].value);
				selectedInputs.push(inputdata);
				cntInputsSelected++;
				window.selectedInputTotal+= inputdata.balance;
			}
	}
	document.getElementById("addrinfo").innerHTML = cntInputsSelected +" address(es) selected, totalling "+formatADK(parseInt(window.selectedInputTotal));
}

// Perform Transfer

function DoTransfer(){
	if (operationInProgress){ alert("Operation already in progress. please wait"); return; };
	operationInProgress = true;
	var aidos = new Aidos({'provider': document.getElementById("node").value});
	try {
		setStatus("Preparing Transfer and waiting for Proof of Work (be patient, this can take a while)...");
		inputCheck();
		var amountToTransfer = (document.getElementById("amountToSend").value);
		var targetAddress = document.getElementById("destAddress").value.trim().toUpperCase();
		var remainderAddress = document.getElementById("remainderAddress").value.trim().toUpperCase();
		var transferTag = document.getElementById("transferTag").value.trim().toUpperCase();
		var smartData = document.getElementById("smartData").value.trim().toUpperCase();
		
		// convert ADK to ADK units  = ADK * 100000000, but cant just multiply due to java double precision issues
		amountToTransfer += "00000000"; // first add 8 "0", then move . as necessary
		var decPos = amountToTransfer.indexOf('.');
		if(decPos !== -1){ //contains a decimal
			var beforeDecimal = amountToTransfer.substring(0,decPos);
			var afterDecimal = amountToTransfer.substring(decPos+1,decPos+1+8); //max 8 digits after decimal
			amountToTransfer = beforeDecimal+""+afterDecimal; // removing . is like multiplying with 100000000
		}
		console.log("amountToTransfer:"+amountToTransfer);
		var amountToTransferUnits = parseInt(amountToTransfer);
		console.log("amountToTransferUnits:"+amountToTransferUnits);
		// checks
		console.log(amountToTransferUnits+ " : " + window.selectedInputTotal);
		if (isNaN(amountToTransferUnits) || amountToTransferUnits > window.selectedInputTotal){
			setStatus("Error: Not enough balance or transfer amount invalid. Ensure you select enough input addresses to cover amount.");
			operationInProgress = false;
			return;
		}
		if (targetAddress.length != 90 || !isValidAZ9(targetAddress) || !aidos.utils.isValidChecksum(targetAddress)){
			setStatus("Error: Invalid Target Address:  Not 90 characters long or contains invalid chars");
			operationInProgress = false
			return;
		}
		targetAddress = targetAddress.substring(0,81);
		if (remainderAddress.length != 90|| !isValidAZ9(remainderAddress) || !aidos.utils.isValidChecksum(remainderAddress)){
			setStatus("Error: Invalid Remainder Address:  Not 90 characters long or contains invalid chars");
			operationInProgress = false
			return;
		}
		remainderAddress = remainderAddress.substring(0,81);
		if (transferTag.length > 27|| !isValidAZ9(transferTag)){
			setStatus("Error: Transfer TAG is > 27 characters long or contains invalid chars. Can only be [A-Z9].");
			operationInProgress = false
			return;
		}
		if (smartData.length > 81|| !isValidAZ9(smartData)){
			setStatus("Error: SmartData is > 81 characters long or contains invalid chars. Can only be [A-Z9].");
			operationInProgress = false
			return;
		}
	
		setTimeout(() => {
			var options = {
				inputs : window.selectedInputs,
				address : remainderAddress
			};
			console.log(options);
			var seed = document.getElementById("seed").value;
			var transfers = 
				[{
					  message:smartData, 
					  tag:transferTag, 
					  address:targetAddress, 
					  value:amountToTransferUnits
				}];
			console.log(transfers);
			
			aidos.api.prepareTransfers(seed, transfers, options, 
				function (
							error,
							trytes
						  ) {
								if (error) {
								  console.log(error);
									setStatus("Transaction Error:" + error);
									operationInProgress = false;
								}
								else {
									aidos.api.sendTrytes(trytes, depth, minWeightMagnitude, 
										function (
											error,
											trytes
										) {
											if (error) {
												console.log(error);
												setStatus("Transaction Error:" + error);
												operationInProgress = false;
											}
											else {
												setStatus("Transaction Sent. Please note: Milestone confirmation can take a while (usually 10-20 mins).");
												operationInProgress = false;
												const addrList = document.getElementById("addrList");
												addrList.innerHTML = '';
												const sendADK = document.getElementById("sendADK");
												sendADK.innerHTML = 'ADK Sent. Please wait at least 10-15 minutes for the transactions to confirm';
											}
										}
									)
								}	
						  }
			)
		   
		}, 10);
	} // try
	catch(err){
		alert (err);
		console.error(err);
		operationInProgress = false;
	}
}
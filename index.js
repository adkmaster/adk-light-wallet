var Aidos = aidos;

function bodyOnLoad(){
	//alert('loaded')
}

function GetNodeInfo(){
	var aidos = new Aidos({'provider': document.getElementById("node").value});
	
	aidos.api.getNodeInfo(function(error, success) {
		if (error) {
			console.error(error);
			alert((error));
		} else {
			console.log(success);
			alert(JSON.stringify(success));
		}
	})
}

function ScanAddressesButton(){
	
	const addrList = document.getElementById("addrList");
    addrList.innerHTML = '';
	
	var aidos = new Aidos({'provider': document.getElementById("node").value});
	var options = {
		index: parseInt(document.getElementById("addressIndexStart").value),
		total: parseInt(document.getElementById("addressIndexEnd").value)+1-parseInt(document.getElementById("addressIndexStart").value),
		checksum: true
	};
	var seed = document.getElementById("seed").value;
	
	aidos.api.getNewAddress(seed, options, function(error, addresses) {
		if (error) {
			alert(error);
			console.error(error)
		} else {
			console.log(addresses)
			//alert(JSON.stringify(success));
			aidos.api.getBalances(addresses, 100, function(error, balance) {
					if (error) {
							alert(error);
							console.error(error)
					} else {
						   console.log(balance);
							var startindex = options.index;
							for (var i = 0; i < addresses.length; i++) { 
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
								newTD2.appendChild(document.createTextNode(addresses[i]));
								newTD3.appendChild(document.createTextNode(balance.balances[i]));
								newTD4.appendChild(document.createTextNode("[checkbox]"));
								addrList.appendChild(newTR);
							}
					}
			})
		}
	})
}
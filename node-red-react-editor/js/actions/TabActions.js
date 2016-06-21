import {TAB_ADD, TAB_SELECT, TAB_UPDATE} from '../constants/ActionTypes';
import {getID} from '../utils/nodeUtils';

const _createNewTab = function(){
	return {
		type: "tab",
		id: getID(),
		label: "new package",		
	}
}

export function addTab(){
	return {
		type: TAB_ADD,
		tab: _createNewTab(),
	}
}

export function updateTab(label){
	console.log("updating tab!!");
	console.log(label);
	return {
		type: TAB_UPDATE,
		label,
	}
}

export function selectTab(tab){
    return {
      type: TAB_SELECT,
      tab
    }
}
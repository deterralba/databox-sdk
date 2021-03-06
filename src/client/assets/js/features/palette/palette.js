import { createStructuredSelector } from 'reselect';
import config from 'config';
import fetch from 'isomorphic-fetch'

const REQUEST_NODES  = 'iot.red/nodetypes/REQUEST_NODES';
const RECEIVE_NODES  = 'iot.red/nodetypes/RECEIVE_NODES';
export const NAME = 'palette';

const _categorise=(nodes)=>{
	return nodes.reduce((acc, node) => {
		acc[node.def.category] = acc[node.def.category] || [];
		acc[node.def.category].push(node);
		return acc;
	},{});
}

const initialState = {
  isFetching:false, 
  didInvalidate: false, 
  types:[], 
  categories:{},
}

export default function reducer(state = initialState, action) {

  switch (action.type) {

  	case  REQUEST_NODES:
	    return Object.assign({}, state, {
        	isFetching: true,
        	didInvalidate: false
      	})
	  
    //called when all of the node types have been recieved!
    case RECEIVE_NODES:
      	return Object.assign({}, state, {
      		isFetching: false,
        	didInvalidate: false,
        	types: action.nodes,
        	categories: _categorise(action.nodes),
      	});
      
	default:
	    return state;
  }
}


//load up all of the nodes that are in the file returned by fetchNodes
const loadNodes = (json)=>{

   const nodes = [];

   json.nodes.forEach((node)=>{
      const n = require(`../../nodes/${node.file}.js`);
      nodes.push({component:n.default.node, name: n.default.type, def: n.default.def, reducer: n.default.reducer});
   });    

   return nodes;
}

//fetch the list of nodes that we want to load in the editor
function fetchNodes(store) {

  return function (dispatch, getState) {

    dispatch(requestNodes())

    return fetch(`${config.root}/nodes/nodes.json`,{
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .then(response => response.json())
      .then(function(json){
          const nodes = loadNodes(json);
          dispatch(receiveNodes(nodes));
      })
  }
}


function requestNodes() {
  return {
    type: REQUEST_NODES,
  }
}

function receiveNodes(nodes) {

  return function(dispatch, getState){
    dispatch({
      type: RECEIVE_NODES,
      nodes,
      receivedAt: Date.now()
    })
  }
}

const palette = (state) => state[NAME];

export const selector = createStructuredSelector({
  palette
});

export const actionCreators = {
  fetchNodes
};

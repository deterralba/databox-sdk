import {convertNode, getID, lookup, addNode, addViewProperties} from 'utils/nodeUtils';
import {scopeify} from 'utils/scopeify';
import request  from 'superagent';
import config from 'config';
import {actionConstants as nodeActionTypes} from "./constants";

import {actionCreators as networkActions} from 'features/network';
import {actionCreators as portActions} from 'features/ports';
import {actionCreators as nodeActions} from 'features/nodes/actions';
import {actionCreators as tabActions} from 'features/workspace';
import {actionCreators as appActions} from 'features/apps';


//TODO: lots of duplication here..
function extractPackages(state){
    const nodesById =state.nodes.nodesById;
    const nodes = Object.keys(nodesById).map(k=>nodesById[k]);

    return state.workspace.tabs.map((tabId)=>{
        
        const pkg = state.workspace.tabsById[tabId];

        return Object.assign({}, pkg, {datastores: nodes.filter((node)=>{
          return (node.z === pkg.id) && (node._def.category === "datastores" || (node._def.category === "outputs" && (node.type != "app" && node.type != "debugger")))
          }).map((node)=>{
              return {
                id: node.id,
                name: node.name || node.type,
                type: node.subtype || node.type, 
              }
            })
          })
    });
}

function extractNodes(newNodesObj, store, lookuptype){

  //var i;
  //var n;
  var newNodes;

  if (typeof newNodesObj === "string") {
      if (newNodesObj === "") {
          return;
      }
      try {
          newNodes = JSON.parse(newNodesObj);
      } catch(err) {
          throw err;
      }
  } else {
      newNodes = newNodesObj;
  }

  if (!(newNodes.constructor === Array)) {
      newNodes = [newNodes];
  } 

  const unknownTypes = newNodes.reduce((acc, n)=>{
  		if (n.type != "tab" && !lookuptype(n.type) && acc.indexOf(n.type) != -1)
  			acc.push(n.type);
  		return acc;
  },[]);  

  const node_map = {};

  const new_nodes = newNodes.reduce((acc, n)=>{
      
      if (n.type !== "tab") {
        
        const def = lookuptype(n.type).def;

        const node = {
            x:n.x,
            y:n.y,
            z:n.z,
            type:0,
            wires:n.wires,
            changed:false
        };
          
        node.id = n.id;
        node.type = n.type;
        node._def = def;
         
		if (!node._def) {
      		if (node.x && node.y) {
	            node._def = {
	              color:"#fee",
	              defaults: {},
	              label: "unknown: "+n.type,
	              labelStyle: "node_label_italic",
	              outputs: n.outputs||n.wires.length,
        		}
      		} 
      		var orig = {};
      		
      		for (var p in n) {
        		if (n.hasOwnProperty(p) && p!="x" && p!="y" && p!="z" && p!="id" && p!="wires") {
          			orig[p] = n[p];
        		}
      		}
      		node._orig = orig;
      		node.name = n.type;
      		node.type = "unknown";
    	}

  		node.inputs = n.inputs||node._def.inputs;
  		node.outputs = n.outputs||node._def.outputs;
        
        for (var d2 in node._def.defaults) {
        	if (node._def.defaults.hasOwnProperty(d2)) {
            
              if (node._def.defaults[d2].type) {
                
                if (node_map[n[d2]]) {
                  node[d2] = node_map[n[d2]].id;
                } else {
                  node[d2] = n[d2];
                }
              } else {
             	node[d2] = n[d2];
              }
            }
        }
    
        node_map[n.id] = node;
        acc.push(node); 
      }
      return acc;
  },[])
  
  const new_links = new_nodes.reduce((acc,n)=>{
  	if (n.wires){
  		for (var w1=0;w1<n.wires.length;w1++) {
              var wires = (n.wires[w1] instanceof Array)?n.wires[w1]:[n.wires[w1]];
              for (var w2=0;w2<wires.length;w2++) {
                  if (wires[w2] in node_map) {
                      const target = node_map[wires[w2]];
                      const id = `${w1}:${n.id}:${target.id}:0`;
                      const link = {id,source:n,sourcePort:w1,target};
                      acc.push(link);
                  }
              }
        }
        delete n.wires;
  	}
  	return acc;
  },[]);
  
  return {nodes: new_nodes, links: new_links}
}

function browseNewUser(){
	return function (dispatch, getState) {
		
		const githubuser = getState().repos.browsingname;
		
		dispatch(networkActions.networkAccess(`requesting repo list for user ${githubuser}`));
		
		request
		  .get(`${config.root}/github/repos/${githubuser}`)
		  .set('Accept', 'application/json')
		  .end(function(err, res){
			if (err){
			  console.log(err);
			  dispatch(networkActions.networkError(`failed to fetch repo list`));
			}else{
			  console.log(res.body);
			  dispatch(networkActions.networkSuccess(`successfully received repos`));
			  dispatch(receivedRepos(res.body));
			  dispatch(setCurrentUser(githubuser));
			}
		 });
	}		 
}

function setCurrentUser(name){
	return {
		type: nodeActionTypes.REPO_CURRENTUSER_CHANGED,
		name,
	}
}

function  browsingNameChanged(name){
	return {
		type: nodeActionTypes.REPO_BROWSINGNAME_CHANGED,
		name,
	}
}

//check if name comes in when new flows loaded.
function nameChanged(name){
	return {
		type: nodeActionTypes.REPO_NAME_CHANGED,
		name,
	}
}

function commitChanged(commit){
    return {
      type: nodeActionTypes.REPO_COMMIT_CHANGED,
      commit
    }
}

function descriptionChanged(description){
	return {
		type: nodeActionTypes.REPO_DESCRIPTION_CHANGED,
		description
	}
}

function submissionError(err){
	return {
		type: nodeActionTypes.SUBMISSION_ERROR,
		err,
	}
}

function submissionResponse(data){
	return {
		type: nodeActionTypes.SUBMISSION_RESPONSE,
		data,
	}
}

function receivedRepos(repos){
	return {
		type: nodeActionTypes.REPO_LIST_RETRIEVED,
		repos,
	}
}

function receivedSHA(repo, sha){
	return {
		type: nodeActionTypes.REPO_SHA_RETRIEVED,
		repo,
		sha
	}
}

function requestRepos(){
	return function (dispatch, getState) {
		
		dispatch(networkActions.networkAccess(`requesting repo list`));
		dispatch(setCurrentUser(""));
		
		request
		  .get(`${config.root}/github/repos`)
		  .set('Accept', 'application/json')
		  .end(function(err, res){
			if (err){
			  console.log(err);
			  dispatch(networkActions.networkError(`failed to fetch repo list`));
			}else{
			  console.log(res.body);
			  dispatch(networkActions.networkSuccess(`successfully received repos`));
			  dispatch(receivedRepos(res.body));
			  if (res.body && res.body.length > 0){
			 	 dispatch(toggleVisible());
			  }
			}
		 });
	}
}

function commitPressed(){

	return function (dispatch, getState) {	
		
		
		const message = getState().repos.tosave.commit;
		const repo 	= getState().repos.loaded;
		const grid = getState().workspace.grid;
		const app = getState().workspace.app;
		const tabsById = getState().workspace.tabsById;

		const nodes = getState().nodes.nodesById;
		const ports = getState().ports.linksById;

    const tabs = getState().workspace.tabs.map((key)=>{    
          return{
              id: tabsById[key].id,
              label: tabsById[key].name,
              type: 'tab'
          }                                                     
    });

		const jsonnodes = Object.keys(nodes).map((key)=>{
			const node = nodes[key];
			return Object.assign({}, convertNode(node, Object.keys(ports).map((k)=>ports[k])));
		});
		
		
		 
		const data = { 
			repo: repo.name, 
			
			flows: [...tabs,...jsonnodes],
			
			manifest: {
  				app: Object.assign({}, app, {id: getID()}),
  				packages: extractPackages(getState()),
  				'allowed-combinations': grid,
  			},
			
			sha: {
					flows:repo.sha.flows, 
					manifest: repo.sha.manifest,
			},
				
			message: message || 'cp commit',
		}
		
		dispatch(networkActions.networkAccess(`saving flows`));
		
		request
			.post(`${config.root}/github/repo/update`)
			.send(data)
  			.set('Accept', 'application/json')
  			.type('json')
  			.end(function(err, res){
  				if (err){
  					console.log(err);
  					dispatch(networkActions.networkError(err.message));
  				}else{
  					dispatch(networkActions.networkSuccess('successfully saved changes!'));
  					dispatch(receivedSHA(repo.name, res.body.sha));
  	 			}
  	 		});	
	}	 
}

//get all of the current details of this repo and submit to the server!
function savePressed(){
	
	return function (dispatch, getState) {
		
		dispatch(networkActions.networkAccess(`saving submission`));
		const nodes = getState().nodes.nodesById;
		const ports = getState().ports.linksById;
    const tabsById = getState().workspace.tabsById;

		const jsonnodes = Object.keys(nodes).map((key)=>{
			const node = nodes[key];
			return Object.assign({}, convertNode(node, Object.keys(ports).map((k)=>ports[k])));
		});
	
		const tabs = getState().workspace.tabs.map((key)=>{    
          return{
              id: tabsById[key].id,
              label: tabsById[key].name,
              type: 'tab'
          }                                                     
    });
	

		const {name, description, commit} = getState().repos.tosave;
  			
		const submission = {
		
			name,
			description,
			commit,
			flows: [
  					...tabs,
  					...jsonnodes
  			],
  			manifest: {
  				app: Object.assign({}, getState().workspace.app, {id: getID()}),
  				packages: extractPackages(getState()),
  				'allowed-combinations': getState().workspace.grid,
  			}
		}
		
		console.log("submitting");
		console.log(submission);

	    request
  			.post(`${config.root}/github/repo/new`)
  			.send(submission)
  			.set('Accept', 'application/json')
  			.type('json')
  			.end(function(err, res){
  				if (err){
  					console.log(err);
  					//dispatch(submissionError(err));
  					dispatch(networkActions.networkError('error saving app'));
  				}else{
          			
          			dispatch(networkActions.networkSuccess('successfully saved app'));
          			dispatch(receivedSHA(res.body.repo, res.body.sha));
          			dispatch(requestRepos());
          			//dispatch(submissionResponse(res.body));
          			//dispatch(receivedCommit(res.body.commit))
  	 			}
  	 		});
  	 }		
}


function publish(){

  return function (dispatch, getState) {
    
    const nodesById =getState().nodes.nodesById;
    const nodes = Object.keys(nodesById).map(k=>nodesById[k]);
    const ports = getState().ports.linksById;
    const tabsById = getState().workspace.tabsById;

    const jsonnodes = nodes.map((node)=>{
      return Object.assign({}, convertNode(node, Object.keys(ports).map((k)=>ports[k])));
    });
    
    const tabs = getState().workspace.tabs.map((key)=>{    
          return{
              id: tabsById[key].id,
              label: tabsById[key].name,
              type: 'tab'
          }                                                     
    });
  
    const flows = [
        ...tabs,
        ...jsonnodes
    ]
      
    const repo = getState().repos.loaded;
      
    const data = {
          
          repo : repo,
          
          flows: flows,
          
          manifest: {
          
          app: Object.assign({}, getState().workspace.app),
          

          packages: extractPackages(getState()),

          'allowed-combinations': getState().workspace.grid,
        }
    };
      
    dispatch(networkActions.networkAccess(`publishing app ${name}`));
      
    console.log("PUBLISHING");
    console.log(data.manifest);

    request
        .post(`${config.root}/github/publish`)
        .send(data)
        .set('Accept', 'application/json')
        .type('json')
        .end(function(err, res){
          if (err){
            console.log("DISPATCHING NETWORK ERRRIR!");
            console.log(err);
            dispatch(networkActions.networkError(err.message));
          }else{
            console.log("DISPATCHING NETWORK SUCCESS!!!");
            dispatch(networkActions.networkSuccess('successfully published app!'));
                //dispatch(submissionSuccess(res.body));
            dispatch(receivedSHA(res.body.repo, res.body.sha));
            dispatch(requestRepos());
          }
        });
  }
}

function requestFlows() {
  return {
    type: nodeActionTypes.REQUEST_FLOWS,
  }
}

function receiveFlows(data, store, lookuptypes){

  const {nodes, links} = extractNodes(data, store, lookuptypes);
  
  return function(dispatch, getState){
  	//unregisterAll(store);
  	dispatch(portActions.clearLinks());
  	dispatch(nodeActions.clearNodes(store));

  	dispatch(nodeActions.receiveFlows(store, nodes));
  	dispatch(portActions.receiveFlows(links));
  	
  	dispatch(toggleVisible());
  	

  	//dispatch(appActions.receiveFlows());
  }
}

//this is picked up by the workspace
function receiveManifest(manifest){
  return {
    type: nodeActionTypes.RECEIVE_MANIFEST,
    manifest,
  }
}

function receiveFlowsError(){
  return {
    type: nodeActionTypes.RECEIVE_FLOWS_ERROR,
  }
}

function fetchFlow(store, repo){
  
  return function (dispatch, getState) {

    dispatch(requestFlows());
    
    const username = getState().repos.currentuser;
   
    request
        .get(`${config.root}/github/flow/`)
        .query({repo:repo, username:username})
        .set('Accept', 'application/json')
        .type('json')
        .end(function(err, res){
          if (err){
            console.log(err);
            dispatch(receiveFlowsError(err));
          }else{
          	console.log("=====>ok got ");
          	console.log(res.body);

            const flows   = res.body.flows.content;
            const manifest  = res.body.manifest.content;
            
            //create all of the tabs
            dispatch(tabActions.receiveTabs(flows.filter((node)=>{
              return node.type === "tab"
            })));
            
            //update the sha of this repo
            
            if (res.body.flows.sha && res.body.manifest.sha){
              dispatch(receivedSHA(repo,
                       {
                          flows: res.body.flows.sha,
                          manifest: res.body.manifest.sha
                       }))
            }else{ //this repo came from another user's github account
              dispatch(receivedSHA(repo,null));
            }
            
            //create all of the flows
            dispatch(receiveFlows(flows, store, lookup.bind(this,getState().palette.types)));  //bind the lookup function to the current set of node types
          
          	console.log("DISPATCHING RECEIEVD MANIFEST!!!");
          	console.log(manifest);

            //create the manifest - this will be picked up by the workspace.
            dispatch(receiveManifest(manifest));
          }
        });   

  }
}

function toggleSaveDialogue(){
	return {
		type: nodeActionTypes.TOGGLE_SAVE_DIALOGUE,
	}	
}

function toggleVisible(){
	return {
		type: nodeActionTypes.TOGGLE_VISIBLE,
	}
}

function mouseUp(){
	return {
		type: nodeActionTypes.MOUSE_UP,
	}
}


export const actionCreators = {
 	browseNewUser,
	browsingNameChanged,
	nameChanged,
	commitChanged,
	descriptionChanged,
	commitPressed,
	savePressed,
	fetchFlow,
	requestRepos,
  publish,
	toggleSaveDialogue,
	toggleVisible,
	mouseUp,
};
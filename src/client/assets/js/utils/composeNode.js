import React, {PropTypes} from 'react';
import NodeEditor from 'features/nodes/components/NodeEditor';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
//import * as RegisterActions from '../actions/RegisterActions';
//import * as DialogueActions  from '../actions/DialogueActions';
//import * as HelpActions from '../actions/HelpActions';

//import {updateNode, updateNodeValueKey, incrementNodeValueKey, initNodeKeys, fetchSampleData} from '../actions/NodeActions';
import {actionCreators as nodeActions} from 'features/nodes';

import {PALETTE_WIDTH, TOOLBAR_HEIGHT, TAB_HEIGHT, WORKSPACE_FOOTER} from 'constants/ViewConstants';

export default function composeNode(Component, nt, config, reducer=null){

	class Node extends React.Component{
		
		static defaultProps = {
      		values: {}
  		}

		constructor(props){
			super(props);
			/*Object.assign(  this, 
              ...bindActionCreators(RegisterActions, props.dispatch), 
              ...bindActionCreators(DialogueActions, props.dispatch),
              ...bindActionCreators(HelpActions, props.dispatch), 
           	);	
            this.initNodeKeys = bindActionCreators(initNodeKeys, this.props.dispatch);
            this.fetchSampleData = bindActionCreators(fetchSampleData, this.props.dispatch);*/
		}

		/*
		* This is called once, when the node is loaded to the palette
		*/
	
		componentDidMount(){
			
          //this.registerType(nt, config, reducer);
    }
		

		render(){

       console.log("in compose node render!");
		   const {configuring, selected, help, inputs, outputs, values, dimensions, dispatch, store} = this.props;
    	   
    	 const props = Object.assign({}, this.props,  {
    	   		width: dimensions.w - PALETTE_WIDTH,
    	   		updateNode: bindActionCreators(updateNode, this.props.dispatch),
    	   		updateNodeValueKey: bindActionCreators(updateNodeValueKey, this.props.dispatch),
    	   		incrementNodeValueKey: bindActionCreators(incrementNodeValueKey, this.props.dispatch),
    	   		
            updateDescription: (type)=>{
    	   			if (selected && selected._def){
    	   				this.updateDescription(selected.id, selected._def.description(type));
    	   			}
    	   		},
    	   		updateOutputSchema: (type)=>{
    	   			if (selected && selected._def){
    	   				this.updateOutputSchema(selected.id, selected._def.schema(type));
    	   			}
    	   		},
    	   		
    	   		fetchSampleData: (type)=>{
    	   			//could add parent sensor type if required?
    	   			this.fetchSampleData(type);
    	   		},
    	 })

       const nodeeditorprops = {
              cancel: this.cancel,
              ok: this.ok,
              title: configuring ? configuring.id : "",
              width: dimensions.w - PALETTE_WIDTH,
              height: dimensions.h - TOOLBAR_HEIGHT - WORKSPACE_FOOTER,
              top:  TOOLBAR_HEIGHT,
              left: PALETTE_WIDTH,
              node: selected,
              help,
              inputs,
              outputs,
              values,
              updateNode: bindActionCreators(updateNode, this.props.dispatch),
              fetchSampleData: bindActionCreators(fetchSampleData, this.props.dispatch),
      }
          
           //TODO: check why cannot do comparison on selected.id against configuring.id
      if (configuring && configuring._def.nodetype === nt){
				return <NodeEditor key={configuring.id} {...nodeeditorprops}>
							   <Component {...props} />
					     </NodeEditor>
			}

			return null;
		}
	}

	function select(state) {
		
	
		  let stateobj = {
          help: state.help,
          selected: state.nodes.selected,
          configuring: state.nodes.configuring,
        	values: state.nodes.editingbuffer,
        	dimensions: state.screen.dimensions,
		  }
      	
      if (reducer){
      	stateobj.local = state.nodes.selected ? state[state.nodes.selected.id] : null;
      }
      	
      if (state.nodes.selected){
      		
      		stateobj.inputs = state.ports.links.filter((link)=>{ 
        		return link.target.id === state.nodes.selected.id;
        	}).map((link)=>{
        		return link.source;
        	});
        	
        	stateobj.outputs = state.ports.links.filter((link)=>{ 
        		return link.source.id === state.nodes.selected.id;
        	}).map((link)=>{
        		return link.target;
        	});  	
      }

      return stateobj;
    }

    Node.PropTypes = {
    	register: React.PropTypes.func, 
    	dispatch: React.PropTypes.func,
    	store: React.PropTypes.object,
	  }

	return {
		type: 		nt,
		def: 		Object.assign({_: (id)=>{return id}}, config, {nodetype:nt}), //TODO: find out what this '_' identity function is for
		reducer: 	reducer,
		node: 		connect(select)(Node),
	}
}
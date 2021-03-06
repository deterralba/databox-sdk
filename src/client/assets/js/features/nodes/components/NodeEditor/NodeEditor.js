import React, { Component } from 'react';
import {TOOLBAR_HEIGHT, INFO_HEIGHT, NODE_EDITOR_PADDING, PALETTE_WIDTH} from 'constants/ViewConstants';
import {fitText, isFunction} from 'utils/utils';
import {connect} from 'react-redux';
import {selector} from 'features/editor';
import Toolbar from 'react-md/lib/Toolbars';
import Button  from 'react-md/lib/Buttons';
import Dialogue from 'components/Dialogue';
import {actionCreators as nodeActions} from '../../actions';
import { bindActionCreators } from 'redux';
import Cell from 'components/Cell';
import Cells from 'components/Cells';
import "./NodeEditor.scss";

const _oneof = function(schema, id, selectedid){

	return schema.map((item, i)=>{
	
		let tail = null;
	
		if (item.type === "object"){
			if (item.properties){
				tail = _payload(item.properties, id, selectedid)
			}
			if (item.oneOf){
				tail = _oneof(item.oneOf, id, selectedid)
			}
		}else{
			tail = _formatprimitive(item,i,id, selectedid);
		}
									
		return 	<div key={i}>
					<div className="flexcolumn">
						<div>
							<div className="centered"><strong>{item.description}</strong></div>
						</div>
						<div>
							<div className="flexcolumn">
								{tail}
							</div>
						</div>
					</div>
				</div>
	});
};

const _formatprimitive = function(item,key,id,selectedid){
	return <div key={key}>
				<div className="flexrow">
					<div className="attributetitle">
						<div className="centered">
							<strong>{key}</strong>
						</div>
					</div>
					<div className="fixed" style={{borderRight: '1px solid #b6b6b6', width:100}}>
						<div className="centered">
							{item.type} 
						</div>
					</div>
					<div style={{borderRight: '1px solid #b6b6b6'}}>
						<div className="centered">
							<div dangerouslySetInnerHTML={{__html: item.description.replace("[id]", id).replace("[selectedid]", selectedid)}}></div>
						</div>
					</div>
				</div>
			</div>
}

const _formatobject = function(item,key,id,selectedid){
			return 	<div key={key}>
						<div className="flexrow">
						
							<div className="attributetitle">
								<div className="centered">
									<strong>{key}</strong>
								</div>
							</div>
					
							<div className="fixed" style={{borderRight: '1px solid #b6b6b6', width:100}}>
								<div className="centered">
									{item.type} 
								</div>
							</div>
							<div>
								<div className="flexcolumn">
									{item.properties ? _payload(item.properties, id, selectedid) : null}
									{item.oneOf ? _oneof(item.oneOf, id, selectedid): null}
								</div>
							</div>
						</div>
				   	</div>
				
}

const _payload = function(schema, id, selectedid){
	
	if (!schema)
		return null;
		
	return Object.keys(schema).map((key,i)=>{
		const item = schema[key];
		if (item.type === "object"){
			return _formatobject(item,key,id, selectedid); 
		}			
		return _formatprimitive(item,key,id, selectedid);
	});
};

@connect(selector, (dispatch) => {
  return{
     actions: bindActionCreators(nodeActions, dispatch),
  }
})
export default class NodeEditor extends Component {
	
	constructor(props){
		super(props);
		this.state = {showhelp:false};
		this._toggleInfo = this._toggleInfo.bind(this);
	}
	
	//shouldComponentUpdate(nextProps, nextState){
        //return this.props.node != nextProps.node;
    //}

	renderHelp(){

		const {node} = this.props;


		const infostyle = {
			height: INFO_HEIGHT,
			background: 'white'
		};

        const namestyle = {
        	fontSize: fitText(node.type || "", {width: "118px", padding: '16px', textAlign:'center'}, 40, 118),
        	color: 'white'
        }

		return <div style={infostyle}>
			<div className="flexcolumn">
				<div className="noborder">
					<div className="flexrow">
						<div style={{WebkitFlex: '0 0 auto'}}>
							<div className="flexcolumn" style={{background:"#333", width:"118px", height:"inherit"}}>
								<div className="noborder">
									<div className="centered" style={{width:"auto"}}>
										<div className="editor-icon" style={{background: node._def.color || '#ca2525'}}><i className={`fa ${node._def.icon} fa-5x fa-fw`}></i></div>
									</div>
								</div>
								<div className="noborder">
									<div style={{textAlign:"center", width:"100%", padding: '0px 10px 0px 10px'}}>
										<div style={namestyle}> {node.type} </div>
									</div>
								</div>
							</div>
						</div>
						<div>
							<div className="flexcolumn">
								<div className="noborder">
									<div className="editor-description">	
										<div dangerouslySetInnerHTML={{__html: node.description}}></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

	}


	renderInputsAndOutputs(){

		const {node, inputs=[], outputs=[]} = this.props;
		
		//dont show if app node or nothing to show
		if (["app", "uibuilder"].indexOf(node.type) != -1 || (inputs.length + outputs.length <= 0))
			return null;

		return <div id="schemas">	
				 	<div className="flexcolumn">
				 		<Cells>
				 			{inputs.length > 0 && <Cell content = {this.renderInputs()} />}	
          					{outputs.length > 0 && <Cell content = {this.renderOutputs()} />}	
          				</Cells>
          			</div>
          		</div>
	}

	renderInputs(){
		const {inputs=[], values, updateNode} = this.props;

		const inputdescription = inputs.map((node,i)=>{
				
				const props = {
						schema: node.schema ? node.schema.output || {} : {}, 
						icon: node._def.icon,
						color: node._def.color, 
						id: node.id,
						selectedid: node.id,
				};
				return <Schema key={i} {...props}/> 
		});

		const inputtogglemsg = values.showinputs ? "click to hide" : "click to view";

		const toggleInputs = ()=>{
 			updateNode("showinputs", !values.showinputs);
		};

		if (inputs.length <= 0){
			return null;
		}

		return  <div className="flexrow" style={{flexBasis:0, maxHeight:200, overflow:'auto'}}>	
					<div style={{flexBasis:0}}>
						<div className="flexcolumn">
							<div className="noborder" style={{background:'#333', color: 'white'}} onClick={toggleInputs}>
								<div className="centered" >
									there are {inputs.length} inputs to this function ({inputtogglemsg})
								</div>
							</div>	
							{values.showinputs && inputdescription}
						</div>
					</div>
				</div>
	}

	renderOutputs(){

		const{outputs=[],values,updateNode} = this.props;
		
		const outputdescription = outputs.map((node, i)=>{
				
				const schema = node.schema ? node.schema.input || {} : {}; 
				
				const props = {
						schema: schema.properties || schema.oneOf, 
						icon: node._def.icon,
						color: node._def.color, 
						id: node.id,
						selectedid: node.id,
				};
				return <Schema key={i} {...props}/> 
		});
			
		const outputtogglemsg = values.showoutputs ? "click to hide" : "click to view";

		const toggleOutputs = ()=>{
 			updateNode("showoutputs", !values.showoutputs);
		};

		if (outputs.length <= 0){
			return null;
		}

		return 	<div className="flexrow" style={{flexBasis:0, maxHeight:200, overflow:'auto'}}>		
					<div style={{flexBasis:0}}>
						<div className="flexcolumn">
							<div className="noborder" style={{background:'#424242', color: 'white'}} onClick={toggleOutputs}>
								<div className="centered" >
									there are {outputs.length} recipients of data from this function {outputtogglemsg}
								</div>
							</div>
							{this.props.values.showoutputs && outputdescription}
						</div>
					</div>
				</div>
	}

	render(){
		const {name, w, h} = this.props;
		const {showhelp} = this.state;

		const close = this.props.actions.nodeConfigureOk;
		const info  = <Button icon onClick={this._toggleInfo}>info_outline</Button>;

		return  <Dialogue 
					title={`configure ${name}`} 
					close={close} 
					ok={this.props.actions.nodeConfigureOk} 
					cancel={this.props.actions.nodeConfigureCancel}
					nav={info}>
					{showhelp && this.renderHelp()}
					{this.renderInputsAndOutputs()}
					{this.props.children}
				</Dialogue>
	}

	_toggleInfo(){
		this.setState({showhelp: !this.state.showhelp});
	}

}


class Schema extends React.Component {

	render(){
		const iconcontainer ={
			color:'white',
			background: this.props.color || '#ca2525',
			border: '2px solid white', 
			textAlign: 'center',
			boxShadow: '0 3px 8px 0 rgba(0, 0, 0, 0.1), 0 6px 20px 0 rgba(0, 0, 0, 0.09)',
			color: 'white',
			height: '100%',
			justifyContent: 'center',
			display: 'flex'
		}
	
		const payload = _payload(this.props.schema, this.props.id, this.props.selectedid);
		
		return 	<div key={this.props.id} className="flexcolumn schema">
					<div className="noborder">
						<div className="flexrow">
							<div className="fixed">
								<div style={iconcontainer}>
									<div style={{alignSelf:'center'}}>
										<i className={`fa ${this.props.icon} fa-2x fa-fw`}></i>
									</div>
								</div>
							</div>
							<div>
								<div className="flexcolumn">
									<div>
										<div className="flexrow">
											<div className="title">
												<div className="centered">
													attribute name
												</div>
											</div>
											<div className="header fixed" style={{width:100}}>
												<div className="centered">
												attribute type
												</div>
											</div>
											<div className="header">
												<div className="centered">
													description
												</div>
											</div>
										</div>
									</div>
									{payload}
								</div>
							</div>
					   </div>
					</div>
				</div>

	}  
}

NodeEditor.defaultProps ={
   ok: ()=>{console.warn("no ok callback provided as prop!")},
   cancel:()=>{console.warn("no cancel callback provided as prop!")},
}

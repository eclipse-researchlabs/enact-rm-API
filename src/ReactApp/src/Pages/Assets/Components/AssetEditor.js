import React from "react";
import * as _ from "lodash";
import { Row, Col, Card, Collapse } from "antd";
import GGEditor, { withPropsAPI, ItemPanel, Item } from "gg-editor";
import FlowToolbar from "../../../components/Editor/FlowToolbar";
import FlowItemPanelArc from "../../../components/Editor/FlowItemsPanelArc";
import FlowDetailPanel from "../../../components/Editor/FlowDetailPanel";

import BackendService from "./../../../components/BackendService";
import KoniCustomNode from "../../../components/Editor/KoniCustomNode";
import EditorMinimap from "../../../components/Editor/EditorMinimap";
import KoniCustomNodeDfd from "../../../components/Editor/KoniCustomNodeDfd";
import AssetEditorWindow from './AssetEditorWindow'

class AssetEditor extends React.Component {
  assetsApi = new BackendService("assets");
  graphQlApi = new BackendService("graphql");

  constructor(props) {
    super(props);

    let newGraphData = {};
    if (!props.koni) {
      const nodesFiltered = props.graphData.nodes.filter(
        node => node.shape !== "koni-custom-node-dfd"
      );
      const edgesFiltered = props.graphData.edges.filter(
        edge => _.findIndex(nodesFiltered, { id: edge.source }) > -1
      );

      newGraphData = {
        ...props.graphData,
        nodes: nodesFiltered,
        edges: edgesFiltered,
        isDfd: false
      };
    } else {
      const nodesFiltered = props.graphData.nodes.filter(
        node => node.shape === "koni-custom-node-dfd"
      );
      const edgesFiltered = props.graphData.edges.filter(
        edge => _.findIndex(nodesFiltered, { id: edge.source }) > -1
      );

      newGraphData = {
        ...props.graphData,
        nodes: nodesFiltered,
        edges: edgesFiltered,
        isDfd: true
      };

      this.graphQlApi.get(`?query={containers{id,name,assets{id,name,payload}}}`).then(data => {
        var assets = [];
        _.forEach(data.containers, container => {
          _.forEach(container.assets, asset => {
            asset.payload = JSON.parse(asset.payload);
            asset.container = container;
            if (asset.payload !== null) {
              asset.internalType = this.getTypeByColor(asset.payload.Color);
              if (asset.internalType !== undefined && newGraphData.nodes.filter(x => x.id === asset.id).length === 0) assets.push(asset);
            }
          })
        })
        var finalAssets = [];
        _.forEach(_.groupBy(assets, x => x.internalType), type => {
          var newType = { name: _.head(type).internalType, containers: [] };
          _.forEach(_.groupBy(type, x => x.container.id), container => {
            var newContainer = { name: _.head(container).container.name, assets: container };
            newType.containers.push(newContainer);
          })
          finalAssets.push(newType);
        })
        console.log('finalAssets', finalAssets)
        this.setState({ allAssets: finalAssets });
      })
    }
    // console.log('newGraphData', newGraphData)
    this.state = {
      allAssets: [],
      toolbarItems: props.toolbarItems,
      itemsPanel: props.itemsPanel,
      containerId: props.containerId,
      graphData: newGraphData
    };
  }

  getTypeByColor(color) {
    if (color === "#69C0FF") {
      return "entity";
    } else if (color === "#B37FEB") {
      return "process";
    } else if (color === "#5CDBD3") {
      return "dataStore";
    }
  }

  createGroup(item) {
    this.assetsApi
      .post("groups", {
        containerRootId: this.props.containerId,
        name: `Group ${this.props.graphData.groups.length}`,
        assets: item
      })
      .then(result => {
        result.json().then(data => {
          this.props.loadData();
        })
      });
  }

  render() {
    return (
      <div>
        <GGEditor
          onAfterCommandExecute={({ command }) => {
            if (!_.isUndefined(command.addGroupId)) {
              this.createGroup(command.selectedItems);
            }
          }}>
          <Row>
            <Col span={24}>
              <FlowToolbar items={this.state.toolbarItems} />
            </Col>
          </Row>
          <Row>
            {!_.isEmpty(this.state.itemsPanel) && (
              <Col span={4}>
                <FlowItemPanelArc items={this.state.itemsPanel} />
                <ItemPanel className="itemPanel">
                  <Collapse accordion>
                    {this.state.allAssets.map((type) => {
                      return (
                        <Collapse.Panel header={type.name} key={type.name}>
                          {type.containers.map((container) => (
                            <span>
                              <h4>{container.name}</h4>
                              {container.assets.map(asset => (
                                <span>
                                  <Row style={{ marginTop: 5 }}>
                                    <Col span={8}>
                                      <Item
                                        key={`item_arc_${asset.id}`}
                                        type={asset.payload.Type}
                                        size={asset.payload.Size}
                                        shape={asset.payload.Shape}
                                        model={{
                                          isDefined: true,
                                          assetId: asset.id,
                                          id: asset.id,
                                          color: asset.payload.Color,
                                          label: asset.name,
                                          src: asset.payload.Src,
                                          labelOffsetY: asset.payload.LabelOffsetY,
                                          icon: asset.payload.Icon
                                        }}
                                        src={asset.payload.Src}
                                      />
                                    </Col>
                                    <Col span={16}>
                                      {asset.name}
                                    </Col>
                                  </Row>
                                  <hr />
                                </span>
                              ))}
                            </span>
                          ))}
                        </Collapse.Panel>
                      )
                    })}
                  </Collapse>
                </ItemPanel>
              </Col>
            )}
            <Col span={_.isEmpty(this.state.itemsPanel) ? 24 : 16} style={{ maxHeight: '100%' }}>
              <AssetEditorWindow {...this.state}></AssetEditorWindow>
            </Col>
            {!_.isEmpty(this.state.itemsPanel) && (
              <Col span={4}>
                <FlowDetailPanel />
                <EditorMinimap />
              </Col>
            )}
          </Row>
          <KoniCustomNode />
          <KoniCustomNodeDfd />
        </GGEditor>
      </div>
    );
  }
}

export default withPropsAPI(AssetEditor);

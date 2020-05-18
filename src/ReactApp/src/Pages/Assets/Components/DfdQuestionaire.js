import React from "react";
import { withTranslation } from "react-i18next";
import {
    Button,
    Tag,
    Select,
    Radio,
    Row, Tooltip,
    Col,
    message,
} from "antd";
import BackendService from "../../../components/BackendService";
import * as _ from "lodash";

class DfdQuestionaire extends React.Component {
    assetsApi = new BackendService(`assets`);

    constructor(props) {
        super(props);

        this.state = {
            nodes: props.nodes,
            showModal: false,
            questions: null,
            answeredEntries: 0,
            totalEntries: 1,
        };
    }

    componentDidMount() {
        console.log('nodes', this.state.nodes, this.props.nodes)
        fetch("dfdQuestionaire.json")
            .then(r => r.json())
            .then(r => {
                this.setState({ questions: r }, () => {
                    this.initializeList();
                });
            });

    }
    updateQuestionaire = (id, value) => {
        var questions = this.state.questions;
        questions[this.getCurrentDataType()].filter(x => x.Id === id)[0].value = value.target.value;
        questions[this.getCurrentDataType()].filter(x => x.Id === id)[0].wasModified = true;
        this.setState({ questions }, () => {
            this.updateList();
        });
    }

    initializeList = () => {
        var payload = this.props.currentRecord.payload;
        if (typeof payload === 'string' || payload instanceof String) payload = JSON.parse(this.props.currentRecord.payload || "{}");
        if (payload === null) payload = {};
        var dfdAnswers = payload["DfdQuestionaire"]

        if (this.state.questions === null || this.state.questions[this.getCurrentDataType()] === undefined) return;

        var questions = this.state.questions;
        questions[this.getCurrentDataType()].forEach(entry => {
            if (entry.type === undefined) entry.type = "boolean";
            if (entry.isVisible === undefined) entry.isVisible = false;
            if (entry.type === "list") {
                entry.possibleValues = [];
                switch (entry.source) {
                    case "dataStores": entry.possibleValues = this.props.nodes.filter(x => this.getDataType(x.payload) === "dataStore").map(x => { return { key: x.id, value: x.name } });
                }
            }
            if (entry.value === undefined) {
                if (entry.type === "list") entry.value = [];
                else entry.value = "na";
            }

            var savedEntry = (dfdAnswers || []).filter(x => x.id === entry.Id)[0];
            if (entry.requires !== undefined) {
                var requiredCondition = questions[this.getCurrentDataType()].filter(x => x.Id === entry.requires)[0];
                if (requiredCondition !== null && requiredCondition.value === 'yes') entry.isVisible = true;
                else entry.isVisible = false;
            } else
                entry.isVisible = true;
            if (savedEntry) {
                entry.isVisible = savedEntry.isVisible;
                entry.value = savedEntry.value;
            }
        })

        var totalEntries = questions[this.getCurrentDataType()].filter(x => x.isVisible).length;
        var answeredEntries = questions[this.getCurrentDataType()].filter(x => x.isVisible && x.value !== 'na').length;

        this.setState({ questions, totalEntries, answeredEntries })
    }

    updateList = () => {
        if (this.state.questions === null || this.state.questions[this.getCurrentDataType()] === undefined) return;

        var questions = this.state.questions;
        questions[this.getCurrentDataType()].forEach(entry => {
            if (entry.requires !== undefined) {
                var requiredCondition = questions[this.getCurrentDataType()].filter(x => x.Id === entry.requires)[0];
                if (requiredCondition !== null && requiredCondition.value === 'yes') entry.isVisible = true;
                else entry.isVisible = false;
            } else
                entry.isVisible = true;
        })

        var totalEntries = questions[this.getCurrentDataType()].filter(x => x.isVisible).length;
        var answeredEntries = questions[this.getCurrentDataType()].filter(x => x.isVisible && (x.value !== 'na' && x.value.length > 0)).length;

        this.setState({ questions, totalEntries, answeredEntries })
    }

    saveProfile = () => {
        var values = this.state.questions[this.getCurrentDataType()].map(x => { return ({ id: x.Id, value: x.value, isVisible: x.isVisible }) });

        this.assetsApi.put(`dfdQuestionaire`, { assetId: this.props.currentRecord.id, payload: JSON.stringify(values) }).then(() => {
            var payload = JSON.parse(this.props.currentRecord.payload || "{}");
            if (payload["DfdQuestionaire"] === undefined) payload["DfdQuestionaire"] = [];
            payload["DfdQuestionaire"] = values;
            this.props.currentRecord.payload = JSON.stringify(payload);
            message.success(`Questionaire saved!`)
        });

    };

    getTag = percent => {
        if (percent > 99) {
            return <Tag color="green">Completed in: {Math.round(percent)} %</Tag>;
        } else if (percent > 70) {
            return <Tag color="orange">Completed in: {Math.round(percent)} %</Tag>;
        } else {
            return <Tag color="red">Completed in: {Math.round(percent)} %</Tag>;
        }
    };

    getCurrentDataType = () => {
        if (
            !_.isEmpty(this.props.currentRecord) &&
            !!this.props.currentRecord.payload
        ) {
            return this.getDataType(this.props.currentRecord.payload)
        }
        return null;
    };

    getDataType = (payload) => {
        if (typeof payload === 'string' || payload instanceof String) payload = JSON.parse(payload || `{ "Color": "" }`);
        if (payload != null) {
            var color = payload.Color || "";
            if (color === "#69C0FF") {
                return "entity";
            } else if (color === "#B37FEB") {
                return "process";
            } else if (color === "#5CDBD3") {
                return "dataStore";
            }
        }
    }

    render() {
        if (this.state.questions === null || this.state.questions[this.getCurrentDataType()] === undefined) return (<span></span>);

        return (
            <div>
                {(this.state.questions != null) && (
                    <span>
                        <div><span>{this.getCurrentDataType()} {this.getTag((this.state.answeredEntries / this.state.totalEntries) * 100)}</span></div>
                        {this.state.questions[this.getCurrentDataType()].map(question => {
                            return (
                                <Row style={{ padding: 10 }} key={question.Id}>
                                    <Col span={16}>
                                        <Tooltip placement="top" title={question.description}>{question.title}</Tooltip>
                                    </Col>
                                    <Col span={8}>
                                        {(question.type === "boolean") && (
                                            <Radio.Group style={{ float: 'right' }} disabled={!question.isVisible}
                                                onChange={(e) => this.updateQuestionaire(question.Id, e)} defaultValue="na" value={question.value} buttonStyle="solid">
                                                <Radio.Button value="na">No answer</Radio.Button>
                                                <Radio.Button value="yes">Yes</Radio.Button>
                                                <Radio.Button value="no">No</Radio.Button>
                                            </Radio.Group>
                                        )}
                                        {(question.type === "list") && (
                                            <Select
                                                style={{ width: 100 + '%' }}
                                                showSearch mode="multiple"
                                                optionFilterProp="children"
                                                disabled={!question.isVisible}
                                                value={question.value}
                                                onChange={(e) => this.updateQuestionaire(question.Id, { target: { value: e } })}
                                                filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                                            >
                                                {(question.possibleValues || []).map(x => <Select.Option value={x.key}>{x.value}</Select.Option>)}
                                            </Select>
                                        )}
                                    </Col>
                                </Row>
                            )
                        }
                        )}
                        <Row>
                            <Col span={20}></Col>
                            <Col span={4}>
                                <Button type="primary" onClick={() => this.saveProfile()}>Save</Button>
                            </Col>
                        </Row>
                    </span>
                )}
            </div>
        );
    }
}

export default withTranslation()(DfdQuestionaire);

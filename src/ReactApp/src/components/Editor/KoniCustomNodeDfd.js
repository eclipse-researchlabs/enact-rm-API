import React from "react";
import { RegisterNode } from "gg-editor";

class KoniCustomNodeDfd extends React.Component {
  render() {
    const config = {
      draw(item) {
        const keyShape = this.drawKeyShape(item);
        keyShape._attrs.fillOpacity = 10;

        // draw label
        this.drawLabel(item);

        // draw image
        const group = item.getGraphicGroup();
        const model = item.getModel();

        var sizes = [model.size, model.size];
        if (model.size.includes("*")) sizes = model.size.split("*");

        console.log('koni-dfd', model)

        group.addShape("image", {
          attrs: {
            x: -sizes[0] / 3.3,
            y: -sizes[1] / 3.3,
            width: sizes[0] * 0.6,
            height: sizes[1] * 0.6,
            img: model.icon,
          }
        });

        return keyShape;
      }
    };

    return <RegisterNode name={this.props.name} config={config} />;
  }
}

export default KoniCustomNodeDfd;

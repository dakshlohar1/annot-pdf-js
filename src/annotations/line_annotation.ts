import {
  LineEndingStyle,
  MarkupAnnotation,
  MarkupAnnotationObj,
} from "./annotation_types";
import { ErrorList, InvalidAnnotationTypeError } from "./annotation_errors";
import { CryptoInterface } from "../parser";
import { WriterUtil } from "../writer-util";
import {
  AppStream,
  XObjectObj,
  GraphicsStateParameter,
} from "../appearance-stream";
import { Resource } from "../resources";
import { ContentStream, GraphicsObject } from "../content-stream";
import { Util } from "../util";

export interface LineAnnotation extends MarkupAnnotation {
  points: number[]; // /L[x1 y2 x2 y2]:
  borderStyle?: any; // /BS
  lineEndingStyles?: LineEndingStyle[]; // /LE
}

export class LineAnnotationObj
  extends MarkupAnnotationObj
  implements LineAnnotation
{
  lineEndingStyles: LineEndingStyle[] = [];
  points: number[] = [];

  constructor() {
    super();
    this.type = "/Line";
    this.type_encoded = [47, 76, 105, 110, 101]; // = '/Line'
  }

  public writeAnnotationObject(cryptoInterface: CryptoInterface): number[] {
    let ret: number[] = super.writeAnnotationObject(cryptoInterface);

    if (this.points && this.points.length > 0) {
      ret = ret.concat(WriterUtil.SUBJ);
      ret = ret.concat(Util.LITERAL_STRING_START);
      ret = ret.concat([76, 105, 110, 101]); // Line
      ret = ret.concat(Util.LITERAL_STRING_END);
      ret = ret.concat(WriterUtil.LINE);
      ret.push(WriterUtil.SPACE);
      ret = ret.concat(WriterUtil.writeNumberArray(this.points));
      ret.push(WriterUtil.SPACE);
    }

    if (this.lineEndingStyles && this.lineEndingStyles.length >= 1) {
      ret = ret.concat(WriterUtil.LINE_ENDING);
      ret.push(WriterUtil.ARRAY_START);
      ret.push(WriterUtil.SPACE);
      ret = ret.concat(this.convertLineEndingStyle(this.lineEndingStyles[0]));
      if (this.lineEndingStyles.length === 2) {
        ret.push(WriterUtil.SPACE);
        ret = ret.concat(this.convertLineEndingStyle(this.lineEndingStyles[1]));
      }
      ret.push(WriterUtil.SPACE);
      ret.push(WriterUtil.ARRAY_END);
      ret.push(WriterUtil.SPACE);
    }

    return ret;
  }

  public validate(enact: boolean = true): ErrorList {
    let errorList: ErrorList = super.validate(false);

    if (this.type !== "/Line") {
      errorList.push(
        new InvalidAnnotationTypeError(`Invalid annotation type ${this.type}`)
      );
    }

    // validate points
    if (this.points.length < 4) {
      errorList.push(new Error("At least 4 points are required"));
    }

    // validate points are numbers
    for (let i = 0; i < this.points.length; i++) {
      if (typeof this.points[i] !== "number") {
        errorList.push(new Error(`Point ${i} is not a number`));
      }
    }

    if (enact) {
      for (let error of errorList) {
        throw error;
      }
    }

    return errorList;
  }

  public createDefaultAppearanceStream() {
    this.appearanceStream = new AppStream(this);
    this.appearanceStream.new_object = true;
    let xobj = new XObjectObj();
    xobj.object_id = this.factory.parser.getFreeObjectId();
    xobj.new_object = true;
    xobj.bBox = this.rect;
    xobj.matrix = [1, 0, 0, 1, -this.rect[0], -this.rect[1]];
    let cs = new ContentStream();
    xobj.contentStream = cs;
    let cmo = cs.addMarkedContentObject(["/Tx"]);
    let go = cmo.addGraphicObject();

    if (this.opacity !== 1) {
      go.addOperator("gs", ["/GParameters"]);

      let gsp = new GraphicsStateParameter(
        this.factory.parser.getFreeObjectId()
      );
      gsp.CA = gsp.ca = this.opacity;
      this.additional_objects_to_write.push({
        obj: gsp,
        func: (ob: any) => ob.writeGStateParameter(),
      });
      let res = new Resource();
      res.addGStateDef({ name: "/GParameters", refPtr: gsp.object_id });
      xobj.resources = res;
    }
    go.setLineColor(this.color)
      .setFillColor(this.color)
      .drawLine(this.points[0], this.points[1], this.points[2], this.points[3]);

    this.appearanceStream.N = xobj;
    this.additional_objects_to_write.push({
      obj: xobj,
      func: (ob: any, cryptoInterface: CryptoInterface) =>
        ob.writeXObject(cryptoInterface),
    });
  }
}

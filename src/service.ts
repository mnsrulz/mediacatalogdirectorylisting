import * as mongoose from 'mongoose';
import { MediaSchema } from './models/mediaModel';

const MediaList = mongoose.model('MediaCatalog', MediaSchema);

export class Service {
  /**
 *
 */
  constructor() {
    
  }

  async listYears(): Promise<FileNode[]> {
    var allMoviesGroupByYear: any[] = await MediaList.aggregate([
      {
        "$match": { "imdbInfo": { $ne: null } },
      },
      { "$group": { _id: "$imdbInfo.year", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    return allMoviesGroupByYear.map((x) => {
      const f: FileNode = {
        id: `/movie/${x._id}`,
        parent: x._id,
        title: x._id,
        isDirectory: true,
        size: 0,
      };
      return f;
    });
  }

  async listAllMoviesOfYear(year: number): Promise<FileNode[]> {
    var allMoviesGroupByYear: any[] = await MediaList.aggregate(
      [
        { "$match": { "imdbInfo.year": `${year}` } },
        {
          "$group": { _id: "$imdbInfo.id", title: { $max: "$imdbInfo.title" } },
        },
        { $sort: { title: 1 } },
      ],
    );

    return allMoviesGroupByYear.map((x) => {
      const title = decodeURI(encodeURI(x.title).replace("%C2%A0", "%20"));
      //console.log(encodeURI(x.title));
      const f: FileNode = {
        id: `/movie/${year}/${title}-${x._id}`,
        parent: x._id,
        title: title,
        isDirectory: true,
        size: 0,
      };
      return f;
    });
  }
}

interface FileNode {
  parent: string;
  id: string;
  title: string;
  isDirectory: boolean;
  size?: number;
}

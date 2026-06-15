export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  borough: string;
}

export interface LineSummary {
  id: string;
  name: string;
  color: string;
  stationCount: number;
}

export interface LineData {
  id: string;
  name: string;
  color: string;
  stations: Station[];
}

export interface BoroughPath {
  name: string;
  path: string;
}

export interface BoroughsData {
  viewBox: string;
  boroughs: BoroughPath[];
}

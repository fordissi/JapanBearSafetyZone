/**
 * Calculates the distance between two coordinates in kilometers using the Haversine formula.
 */
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export interface RegionBearInfo {
  name: string;
  scientificName: string;
  type: 'BROWN' | 'BLACK';
  riskLevel: string;
  features: string;
  advice: string;
}

/**
 * Determines the predominant bear species based on location.
 * Boundary is roughly the Tsugaru Strait (Lat 41.5 approx).
 */
export const getRegionBearInfo = (lat: number): RegionBearInfo => {
  // Hokkaido (North of Tsugaru Strait, approx lat > 41.2)
  if (lat > 41.2) {
    return {
      name: '北海道棕熊 (Higuma)',
      scientificName: 'Ursus arctos lasiotus',
      type: 'BROWN',
      riskLevel: 'EXTREME (極高)',
      features: '日本最強猛獸。體長可達2.5米，體重400kg+。奔跑時速60km。',
      advice: '絕對不可裝死。遇到時需保持極遠距離，切勿奔跑。'
    };
  } else {
    // Honshu / Shikoku (Asian Black Bear)
    // Note: Extinct in Kyushu/Okinawa, but we assume Black Bear logic for safety in main islands.
    return {
      name: '亞洲黑熊 (Tsukinowaguma)',
      scientificName: 'Ursus thibetanus japonicus',
      type: 'BLACK',
      riskLevel: 'HIGH (高)',
      features: '胸前有月牙白紋。體型較小但極敏捷，善於爬樹。',
      advice: '多為突發性驚嚇攻擊。務必配戴熊鈴告知存在。'
    };
  }
};
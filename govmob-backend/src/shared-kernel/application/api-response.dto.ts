export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export class ApiResponseHelper {
  static success<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}

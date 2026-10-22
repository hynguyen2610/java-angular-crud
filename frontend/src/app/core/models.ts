// These mirror the Java records ProductDto, PageResponse and AuthController.LoginResponse.
export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  createdAt: string; // ISO date-time string from Jackson
  hasImage: boolean;
}

export type ProductInput = Omit<Product, 'id' | 'createdAt' | 'hasImage'>;

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface LoginResponse {
  token: string;
  username: string;
}

export interface UserProfile {
  username: string;
}

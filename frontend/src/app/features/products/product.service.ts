import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Page, Product, ProductInput } from '../../core/models';
import { API_URL } from '../../core/tokens';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private url = `${inject(API_URL)}/products`;

  list(page = 0, size = 5, q = '') {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) params = params.set('q', q);
    return this.http.get<Page<Product>>(this.url, { params });
  }

  get(id: number) {
    return this.http.get<Product>(`${this.url}/${id}`);
  }

  create(product: ProductInput) {
    return this.http.post<Product>(this.url, product);
  }

  update(id: number, product: ProductInput) {
    return this.http.put<Product>(`${this.url}/${id}`, product);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}

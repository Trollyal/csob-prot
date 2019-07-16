import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ElasticService {

  constructor(private http: HttpClient) {}

  getTransactions$(search?: string, limit = 15) {
    return this.http.post(
      '/api/txhistory/_search',
      {
        size: limit,
        query: {
            query_string: {
                query: `*${search || ''}*`
            }
        }
      }
    ).pipe(
      map((response: any) => {
        const items = response.hits.hits.map((trans) => ({
          ...trans._source,
          timestamp: trans._source['@timestamp']
        }));

        console.log(items);

        return items;
      }),
      catchError((err) => of(throwError(err)))
    );
  }
}

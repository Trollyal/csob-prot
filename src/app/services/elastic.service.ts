import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ElasticService {

  constructor(private http: HttpClient) {}

  getBalance$(account: string) {
    return this.http.post(
      '/api/txhistory/_search',
      {
        size: 1,
        _source: 'balance',
        sort : [
          { '@timestamp' : 'desc' }
          ],
        query: {
          term: {
            account_number: account
          }
        }
      }
    ).pipe(
      map((response: any) => response.hits.hits[0]._source.balance),
      catchError((err) => of(throwError(err)))
    );
  }

  getTransactions$(dates: { start: Date, end: Date }, search?: string, limit = 15) {

    const bool = search
      ? {
        should: [
            {
              query_string: {
                query: `*${ search || '' }*`
              }
            },
            {
              query_string: {
                query: `${ search || '' }`
              }
            }
          ],
        must: [
          {
            range: {
              '@timestamp': {
                gte: dates.start,
                lte: dates.end
              }
            }
          }
        ]
      }
      : {
        must: [
          {
            range: {
              '@timestamp': {
                gte: dates.start,
                lte: dates.end
              }
            }
          }
        ]
      };

    return this.http.post(
      '/api/txhistory/_search',
      {
        size: limit,
        query: {
          bool
        }
      }
    ).pipe(
      map((response: any) => {
        const items = response.hits.hits.map((trans) => ({
          ...trans._source,
          timestamp: trans._source['@timestamp']
        }));

        return items;
      }),
      catchError((err) => of(throwError(err)))
    );
  }

  getHistory$(dates: { start: Date, end: Date }) {
    return this.http.post(
      '/api/txhistory/_search',
      {
        size: 0,
        query: {
          bool: {
            must: [
              {
                term: {
                  account_number: '20912803823080'
                }
              },
              {
                range: {
                  '@timestamp': {
                    gte: dates.start,
                    lte: dates.end
                  }
                }
              }
            ]
          }
        },
        aggs: {
          category: {
            terms: {
              field: 'category.keyword',
              size: 10
            },
            aggs: {
              sum_per_category: {
                sum: {
                  field: 'amount_positive'
                }
              }
            }
          }
        },
      }
    ).pipe(
      map((response: any) => {

        const total = response.aggregations.category.buckets.reduce((sum, itm) => sum + itm.sum_per_category.value, 0);

        const items = response.aggregations.category.buckets.map((itm) => ({
          name: itm.key,
          amount: itm.sum_per_category.value,
          percentage: (itm.sum_per_category.value / total) * 100
        })).sort((a, b) => (a.name > b.name) ? 1 : -1);

        return { items, total };
      }),
      catchError((err) => of(throwError(err)))
    );
  }
}

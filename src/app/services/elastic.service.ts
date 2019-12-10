import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import subHours from 'date-fns/esm/subHours';
import endOfHour from 'date-fns/esm/endOfHour';

@Injectable({
  providedIn: 'root'
})
export class ElasticService {

  constructor(private http: HttpClient) {}

  getBalance$(account: string) {
    return this.http.post(
      '/api/transactions/_search',
      {
        size: 1,
        _source: 'balance',
        sort: [
          { '@timestamp' : 'desc' }
        ],
        query: {
          bool: {
            must: [
              {
                term: {
                  'account_number.keyword': account
                }
              },
              {
                range: {
                  '@timestamp': {
                    gte: subHours(new Date(), 1),
                    lte: endOfHour(new Date())
                  }
                }
              }
            ]
          }
        }
      },
      {
        headers: {
          'Authorization': 'Basic Y3NvYjppYmZ1bGx0ZXh0amVkZQ=='
        }
      }
    );
  }

  getAccounts$() {
    return this.http.post(
      '/api/transactions/_search',
      {
        size: 0,
        query: {
          term: {
            client_id: '3480321802982'
          }
        },
        aggs: {
          uniq_accounts: {
            terms: { field: 'account_number.keyword' }
          }
        }
      },
      {
        headers: {
          'Authorization': 'Basic Y3NvYjppYmZ1bGx0ZXh0amVkZQ=='
        }
      }
    ).pipe(
      map((response: any) => response.aggregations.uniq_accounts.buckets.map((account) => ({ number: account.key }))),
      catchError((err) => of(throwError(err)))
    );
  }

  getTransactions$(dates: { start: Date, end: Date }, search?: string, limit = 15) {

    const bool = search
      ? {
        must: [
          {
            term: {
              client_id: '3480321802982'
            }
          },
          {
            bool: {
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
              ]
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
      : {
        must: [
          {
            term: {
              client_id: '3480321802982'
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
      };

    return this.http.post(
      '/api/transactions/_search',
      {
        size: limit,
        sort: [
          {
            '@timestamp': {
              order: 'desc'
            }
          }
        ],
        query: {
          bool
        }
      },
      {
        headers: {
          'Authorization': 'Basic Y3NvYjppYmZ1bGx0ZXh0amVkZQ=='
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

  getHistory$(dates: { start: Date, end: Date }, accounts: string[] = [], minLabelPercentage = 4) {

    const accountFilters = accounts.map((acc) => ({
      bool: {
        should: [
          {
            match_phrase: {
              'account.number.keyword': acc
            }
          }
        ],
        minimum_should_match: 1
      }
    }));

    return this.http.post(
      '/api/account-category-sum/_search',
      {

        aggs: {
        categories: {
          terms: {
            field: 'category.keyword',
            order: {
              cat: 'desc'
            },
            size: 50
          },
          aggs: {
            cat: {
              sum: {
                field: 'amount_positive.sum'
              }
            }
          }
        }
        },
      query: {
        bool: {
          must: [],
          filter: [
            {
              bool: {
                should: [
                  ...accountFilters
                ],
                minimum_should_match: 1
              }
            },
            {
              range: {
                'counter_effective_date.timestamp': {
                  gte: dates.start,
                  lt: dates.end
                }
              }
            }
          ],
          should: [],
          must_not: []
        }
      }
    },
      {
        headers: {
          'Authorization': 'Basic Y3NvYjppYmZ1bGx0ZXh0amVkZQ=='
        }
      }
    ).pipe(
      map((response: any) => {

        const graphColorMap = {
          shopping: '#bcc221',
          transport: '#4d90fa',
          groceries: '#189e78',
          services: '#c657fa',
          cash: '#49963f',
          restaurants: '#946a26',
          travel: '#e8c527',
          health: '#e66e6e',
          education: '#40b8b2',
          exchange: '#b32d8d',
          others: '#c2c2c2',
          bank_fee: '#e37cd1',
          insurance: '#c9aa90',
          utility: '#2cc76e',
          internet: '#e67aa1',
          salary: '#47ab2d',
          telco: '#2ab3ed',
          entertainment: '#389cda'
        };

        const labels: string[] = [ ];

        const total = response.aggregations.categories.buckets.reduce((sum, cat) => sum + cat.cat.value, 0);

        const dataset = {
          data: [ ],
          backgroundColor: [ ],
          categories: [ ],
          borderWidth: 0,
          minLabel: total * (minLabelPercentage / 100)
        };

        response.aggregations.categories.buckets
          .sort((a, b) => (a.key > b.key) ? 1 : -1)
          .forEach((cat) => {
            labels.push(cat.key);
            dataset.data.push(+(cat.cat.value).toFixed(1));
            dataset.backgroundColor.push(graphColorMap[cat.key]);
            dataset.categories.push(cat.key);
          });

        // FOR BAR GRAPH
        // const items = response.aggregations.categories.buckets.map((itm) => ({
        //   name: itm.key,
        //   amount: itm.sum_aggs.value,
        //   percentage: (itm.sum_aggs.value / total) * 100
        // })).sort((a, b) => (a.name > b.name) ? 1 : -1);

        return { graph: { dataset: [ dataset ], labels }, total };
      }),
      catchError((err) => of(throwError(err)))
    );
  }
}

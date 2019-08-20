import { Component, OnInit } from '@angular/core';
import { ElasticService } from 'src/app/services/elastic.service';
import { FormControl } from '@angular/forms';
import { switchMap, startWith, map, catchError, tap } from 'rxjs/operators';
import subMonths from 'date-fns/esm/subMonths';
import startOfMonth from 'date-fns/esm/startOfMonth';
import endOfMonth from 'date-fns/esm/endOfMonth';
import { forkJoin, throwError, of } from 'rxjs';
import * as pluginDataLabels from 'chartjs-plugin-datalabels';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: [ './home.page.css' ]
})
export class HomePageComponent {

  chartOptions = {
    layout: {
      padding: {
          left: 0,
          right: 0,
          top: 20,
          bottom: 20
      }
    },
    responsive: true,
    legend: {
      position: 'left',
    },
    plugins: {
      datalabels: {
        color: 'rgba(0, 0, 0, 0.6)',
        font: {
          size: 11
        },
        anchor: 'end',
        align: 'end',
        formatter: (value, ctx) => {
          const label = `${ctx.dataset.data[ctx.dataIndex]}%`;
          return label;
        },
      },
    }
  };

  chartPlugins = [ pluginDataLabels ];

  accounts$ = this.elastic.getAccounts$();

  balances$ = this.accounts$.pipe(
    switchMap((accounts: any[]) => forkJoin(
      accounts.map((account) => this.elastic
        .getBalance$(account.number)
        .pipe(
          map((response) => ({ response, acc: account.number }))
        )
      )
    )),
    map((responses: any[]) => responses.reduce((obj, response) => {
      return {
        ...obj,
        [response.acc]: response.response.hits.hits[0]._source.balance
      };
    }, {})),
    startWith({})
  );

  transformMap = {
    0: (now: Date) => ({
      start: subMonths(now, 3),
      end: now
    }),
    1: (now: Date) => ({
      start: startOfMonth(now),
      end: now
    }),
    2: (now: Date) => ({
      start: startOfMonth(subMonths(now, 1)),
      end: endOfMonth(subMonths(now, 1))
    }),
    3: (now: Date) => ({
      start: subMonths(now, 6),
      end: now
    })
  };

  control = new FormControl(0);

  graphData$ = this.control.valueChanges.pipe(
    startWith(0),
    switchMap((val) => this.elastic.getHistory$(this.transformMap[val](new Date())))
  );

  // balance1$ = this.elastic.getBalance$('23840283027');
  // balance2$ = this.elastic.getBalance$('4938430128301');

  trackBy(data: any) {
    return data.name;
  }

  constructor(
    private elastic: ElasticService,
    private _router: Router
  ) {}

  // http://localhost:4200/transactions?lookup=cash&filter=1

  onChartClick(event) {
    this._router.navigate(
      [ '/transactions' ],
      {
        queryParams: {
          lookup: event.active[0]['$datalabels']['$context'].dataset.categories[event.active[0]['$datalabels']['$context'].dataIndex],
          filter: 1
        }
      }
    );
  }
}

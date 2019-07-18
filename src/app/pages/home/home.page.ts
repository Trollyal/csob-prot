import { Component, OnInit } from '@angular/core';
import { ElasticService } from 'src/app/services/elastic.service';
import { FormControl } from '@angular/forms';
import { switchMap, startWith } from 'rxjs/operators';
import subMonths from 'date-fns/esm/subMonths';
import startOfMonth from 'date-fns/esm/startOfMonth';
import endOfMonth from 'date-fns/esm/endOfMonth';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: [ './home.page.css' ]
})
export class HomePageComponent {

  graphColorMap = {
    shopping: '#bcc221',
    transport: '#4d90fa',
    groceries: '#189e78',
    services: '#c657fa',
    cash: '#49963f',
    restaurants: '#946a26',
    travel: '#e8c527',
    health: '#e66e6e',
    education: '#40b8b2',
    exchange: '#b32d8d'
  };

  accounts = [
    '23840283027',
    '20912803823080'
  ];

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

  constructor(private elastic: ElasticService) {}
}

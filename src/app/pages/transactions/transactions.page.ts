import { Component, OnInit } from '@angular/core';
import { ElasticService } from 'src/app/services/elastic.service';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import subMonths from 'date-fns/esm/subMonths';
import startOfMonth from 'date-fns/esm/startOfMonth';
import endOfMonth from 'date-fns/esm/endOfMonth';

@Component({
  selector: 'app-home',
  templateUrl: './transactions.page.html',
  styleUrls: [ './transactions.page.css' ]
})
export class TransactionsPageComponent implements OnInit {

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

  transactions$ = this.route.queryParams.pipe(
    switchMap((params) => this.elastic.getTransactions$(
      this.transformMap[params && params.filter ? params.filter : 0](new Date()),
      params && params.lookup ? params.lookup : ''
    ))
  );

  searchForm = new FormGroup({
    lookup: new FormControl(undefined, [ Validators.required ]),
    time: new FormControl(1)
  });

  constructor(
    private elastic: ElasticService,
    private route: ActivatedRoute,
    private router: Router
  ) {
  }

  onSubmit() {
    this.router.navigate(
      [ '.' ],
      {
        relativeTo: this.route,
        queryParams: {
          lookup: this.searchForm.get('lookup').value,
          filter: this.searchForm.get('time').value
        },
        queryParamsHandling: 'merge'
      }
    );
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => this.searchForm.setValue({
      lookup: params && params.lookup ? params.lookup : undefined,
      time: 1
    }));
  }
}

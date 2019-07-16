import { Component } from '@angular/core';
import { ElasticService } from 'src/app/services/elastic.service';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-home',
  templateUrl: './transactions.page.html',
})
export class TransactionsPageComponent {
  transactions$ = this.route.queryParams.pipe(
    switchMap((params) => this.elastic.getTransactions$(params && params.lookup ? params.lookup : ''))
  );

  searchForm = new FormGroup({
    lookup: new FormControl(undefined, [ Validators.required ])
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
          lookup: this.searchForm.get('lookup').value
        },
        queryParamsHandling: 'merge'
      }
    );
  }
}

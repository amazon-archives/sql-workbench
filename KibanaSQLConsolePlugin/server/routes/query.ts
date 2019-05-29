import QueryService from '../services/query-service';
import { Server } from 'hapi-latest';

export default function query(server: Server, service: QueryService) {
  server.route({
    path: '/api/sql_console/query',
    method: 'POST',
    handler: service.describeQuery
  });
  server.route({
    path: '/api/sql_console/querycsv',
    method: 'POST',
    handler: service.describeQueryCsv
  });
  server.route({
    path: '/api/sql_console/queryjdbc',
    method: 'POST',
    handler: service.describeQueryJdbc
  });
}

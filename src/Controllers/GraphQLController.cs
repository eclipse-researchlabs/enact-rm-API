﻿using Core.AuditTrail.Interfaces.Services;
using Core.Database;
using GraphQL;
using GraphQL.Types;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace Core.Api.Controllers
{
    [Route("api/graphql"), ApiController, EnableCors("CorsRules")]
    public class GraphQlController : ControllerBase
    {
        IDocumentExecuter executer;
        ISchema schema;
        private IAuditTrailService _auditTrailService;

        public GraphQlController(ISchema schema, IDocumentExecuter executer, IAuditTrailService auditTrailService)
        {
            this.schema = schema;
            this.executer = executer;
            _auditTrailService = auditTrailService;
        }

        [HttpGet]
        public IActionResult Get(
            [FromQuery] string query,
            [FromQuery] string variables,
            [FromQuery] string operationName,
            [FromServices]BeawreContext dbContext,
            CancellationToken cancellation)
        {
            var jObject = ParseVariables(variables);
            return Ok(Execute(dbContext, query, operationName, jObject, cancellation).Result.Data);
        }

        async Task<ExecutionResult> Execute(
            BeawreContext dbContext,
            string query,
            string operationName,
            JObject variables,
            CancellationToken cancellation)
        {
            var options = new ExecutionOptions
            {
                Schema = schema,
                Query = query,
                OperationName = operationName,
                Inputs = variables?.ToInputs(),
                UserContext = dbContext,
                CancellationToken = cancellation,
#if (DEBUG)
                ExposeExceptions = true,
                EnableMetrics = true,
#endif
            };

            var result = await executer.ExecuteAsync(options);
            if (result.Errors?.Count > 0)
            {
                Response.StatusCode = (int)HttpStatusCode.BadRequest;
            }
            return result;
        }

        static JObject ParseVariables(string variables)
        {
            if (variables == null)
            {
                return null;
            }

            try
            {
                return JObject.Parse(variables);
            }
            catch (Exception exception)
            {
                throw new Exception("Could not parse variables.", exception);
            }
        }
    }
}
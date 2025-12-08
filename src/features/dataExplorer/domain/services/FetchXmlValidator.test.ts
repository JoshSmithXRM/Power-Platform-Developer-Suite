import { FetchXmlValidator } from './FetchXmlValidator';

describe('FetchXmlValidator', () => {
	let validator: FetchXmlValidator;

	beforeEach(() => {
		validator = new FetchXmlValidator();
	});

	describe('validate', () => {
		describe('empty input', () => {
			it('should reject empty string', () => {
				const result = validator.validate('');

				expect(result.isValid).toBe(false);
				expect(result.errors).toHaveLength(1);
				expect(result.errors[0]?.message).toBe('FetchXML cannot be empty');
			});

			it('should reject whitespace-only string', () => {
				const result = validator.validate('   \n\t  ');

				expect(result.isValid).toBe(false);
				expect(result.errors).toHaveLength(1);
				expect(result.errors[0]?.message).toBe('FetchXML cannot be empty');
			});
		});

		describe('valid FetchXML', () => {
			it('should accept minimal valid FetchXML', () => {
				const fetchXml = `<fetch><entity name="contact" /></fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it('should accept FetchXML with attributes', () => {
				const fetchXml = `
					<fetch top="100">
						<entity name="account">
							<attribute name="name" />
							<attribute name="revenue" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with filter', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="statecode" operator="eq" value="0" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with link-entity', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<link-entity name="account" from="accountid" to="parentcustomerid" alias="acc">
								<attribute name="name" />
							</link-entity>
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with order', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<order attribute="createdon" descending="true" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with all-attributes', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<all-attributes />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with IN condition values', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter>
								<condition attribute="statecode" operator="in">
									<value>0</value>
									<value>1</value>
								</condition>
							</filter>
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with nested filters', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<filter type="or">
								<condition attribute="firstname" operator="eq" value="John" />
								<filter type="and">
									<condition attribute="lastname" operator="eq" value="Doe" />
									<condition attribute="statecode" operator="eq" value="0" />
								</filter>
							</filter>
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});
		});

		describe('root element validation', () => {
			it('should reject non-fetch root element', () => {
				const fetchXml = `<entity name="contact"><attribute name="fullname" /></entity>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('Root element must be <fetch>'))).toBe(true);
			});

			it('should reject XML with different root element', () => {
				const fetchXml = `<query><entity name="contact" /></query>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('Root element must be <fetch>'))).toBe(true);
			});
		});

		describe('entity element validation', () => {
			it('should reject FetchXML without entity element', () => {
				const fetchXml = `<fetch><attribute name="fullname" /></fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('must have at least one <entity> element'))).toBe(true);
			});

			it('should reject entity without name attribute', () => {
				const fetchXml = `<fetch><entity><attribute name="fullname" /></entity></fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('<entity> element must have a "name" attribute'))).toBe(true);
			});
		});

		describe('attribute element validation', () => {
			it('should reject attribute without name', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('<attribute> element must have a "name" attribute'))).toBe(true);
			});

			it('should accept attribute with alias', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" alias="name" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});
		});

		describe('condition element validation', () => {
			it('should reject condition without attribute', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<filter>
								<condition operator="eq" value="0" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('<condition> element must have a "attribute" attribute'))).toBe(true);
			});

			it('should reject condition without operator', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<filter>
								<condition attribute="statecode" value="0" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('<condition> element must have a "operator" attribute'))).toBe(true);
			});

			it('should accept condition without value for null operators', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<filter>
								<condition attribute="emailaddress1" operator="null" />
							</filter>
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});
		});

		describe('link-entity element validation', () => {
			it('should reject link-entity without name', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<link-entity from="accountid" to="parentcustomerid" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('<link-entity> element must have a "name" attribute'))).toBe(true);
			});

			it('should reject link-entity without from', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<link-entity name="account" to="parentcustomerid" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('<link-entity> element must have a "from" attribute'))).toBe(true);
			});

			it('should reject link-entity without to', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<link-entity name="account" from="accountid" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('<link-entity> element must have a "to" attribute'))).toBe(true);
			});
		});

		describe('order element validation', () => {
			it('should reject order without attribute in non-aggregate query', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
							<order descending="true" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('<order> element must have an "attribute" attribute'))).toBe(true);
			});

			describe('aggregate queries', () => {
				it('should accept order with alias in aggregate query', () => {
					const fetchXml = `
						<fetch aggregate='true'>
							<entity name='account'>
								<attribute name='numberofemployees' alias='Total' aggregate='sum' />
								<attribute name='address1_city' alias='Count' aggregate='count' />
								<attribute name='address1_city' alias='City' groupby='true' />
								<order alias='City' />
							</entity>
						</fetch>
					`;

					const result = validator.validate(fetchXml);

					expect(result.isValid).toBe(true);
					expect(result.errors).toHaveLength(0);
				});

				it('should reject order with attribute in aggregate query', () => {
					const fetchXml = `
						<fetch aggregate="true">
							<entity name='account'>
								<attribute name='address1_city' alias='City' groupby='true' />
								<order attribute="address1_city" />
							</entity>
						</fetch>
					`;

					const result = validator.validate(fetchXml);

					expect(result.isValid).toBe(false);
					expect(result.errors.some((e) => e.message.includes('aggregate query must use "alias"'))).toBe(true);
				});

				it('should reject order without alias in aggregate query', () => {
					const fetchXml = `
						<fetch aggregate='true'>
							<entity name='account'>
								<attribute name='address1_city' alias='City' groupby='true' />
								<order descending="true" />
							</entity>
						</fetch>
					`;

					const result = validator.validate(fetchXml);

					expect(result.isValid).toBe(false);
					expect(result.errors.some((e) => e.message.includes('<order> element in aggregate query must have an "alias" attribute'))).toBe(true);
				});

				it('should accept multiple order elements with aliases in aggregate query', () => {
					const fetchXml = `
						<fetch aggregate='true'>
							<entity name='account'>
								<attribute name='address1_city' alias='City' groupby='true' />
								<attribute name='numberofemployees' alias='TotalEmployees' aggregate='sum' />
								<order alias='City' />
								<order alias='TotalEmployees' descending='true' />
							</entity>
						</fetch>
					`;

					const result = validator.validate(fetchXml);

					expect(result.isValid).toBe(true);
				});
			});
		});

		describe('unknown elements', () => {
			it('should reject unknown elements', () => {
				const fetchXml = `
					<fetch>
						<entity name="contact">
							<unknownelement />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('Unknown FetchXML element: <unknownelement>'))).toBe(true);
			});
		});

		describe('XML structure validation', () => {
			it('should reject malformed XML with unclosed tags', () => {
				const fetchXml = `<fetch><entity name="contact">`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('Unclosed tag'))).toBe(true);
			});

			it('should reject malformed XML with mismatched tags', () => {
				const fetchXml = `<fetch><entity name="contact"></fetch></entity>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('Mismatched tags'))).toBe(true);
			});

			it('should reject XML with extra closing tags', () => {
				const fetchXml = `<fetch><entity name="contact" /></fetch></extra>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				expect(result.errors.some((e) => e.message.includes('Unexpected closing tag'))).toBe(true);
			});

			it('should reject XML with unmatched brackets', () => {
				const fetchXml = `<fetch><entity name="contact" /</fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
			});
		});

		describe('line number reporting', () => {
			it('should report correct line number for errors', () => {
				const fetchXml = `<fetch>
<entity name="contact">
<attribute />
</entity>
</fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(false);
				const attributeError = result.errors.find((e) =>
					e.message.includes('<attribute> element must have a "name"')
				);
				expect(attributeError?.line).toBe(3);
			});
		});

		describe('case sensitivity', () => {
			it('should be case-insensitive for element names', () => {
				const fetchXml = `<FETCH><ENTITY name="contact" /></FETCH>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should handle mixed case element names', () => {
				const fetchXml = `<Fetch><Entity name="contact"><Attribute name="fullname" /></Entity></Fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});
		});

		describe('XML comments', () => {
			it('should accept FetchXML with comment at the beginning', () => {
				const fetchXml = `<!-- Account summary query -->
<fetch>
  <entity name="account">
    <attribute name="name" />
  </entity>
</fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});

			it('should accept FetchXML with comment before fetch element', () => {
				const fetchXml = `
					<!-- This is a comment -->
					<fetch>
						<entity name="contact">
							<attribute name="fullname" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with inline comments', () => {
				const fetchXml = `
					<fetch>
						<entity name="account">
							<attribute name="name" />
							<attribute name="revenue" />
							<filter>
								<condition attribute="statecode" operator="eq" value="0" />
							</filter>
							<!-- active accounts only -->
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with multiple comments', () => {
				const fetchXml = `<!-- Query description -->
<!-- Author: Test -->
<fetch>
  <!-- Entity selection -->
  <entity name="contact">
    <attribute name="fullname" />
    <!-- Add more attributes as needed -->
  </entity>
</fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});

			it('should accept FetchXML with multi-line comment', () => {
				const fetchXml = `<!--
  This is a multi-line comment
  explaining the query purpose
-->
<fetch>
  <entity name="account">
    <attribute name="name" />
  </entity>
</fetch>`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
			});
		});

		describe('complex valid FetchXML', () => {
			it('should accept complex production-like FetchXML', () => {
				const fetchXml = `
					<fetch top="50" distinct="true">
						<entity name="opportunity">
							<attribute name="name" />
							<attribute name="estimatedvalue" />
							<attribute name="estimatedclosedate" />
							<attribute name="customerid" />
							<link-entity name="account" from="accountid" to="customerid" alias="customer" link-type="outer">
								<attribute name="name" alias="customername" />
								<attribute name="revenue" />
							</link-entity>
							<link-entity name="systemuser" from="systemuserid" to="ownerid" alias="owner">
								<attribute name="fullname" alias="ownername" />
							</link-entity>
							<filter type="and">
								<condition attribute="statecode" operator="eq" value="0" />
								<condition attribute="estimatedvalue" operator="ge" value="10000" />
								<filter type="or">
									<condition attribute="salesstage" operator="eq" value="100000001" />
									<condition attribute="salesstage" operator="eq" value="100000002" />
								</filter>
							</filter>
							<order attribute="estimatedvalue" descending="true" />
							<order attribute="createdon" descending="false" />
						</entity>
					</fetch>
				`;

				const result = validator.validate(fetchXml);

				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});
	});
});

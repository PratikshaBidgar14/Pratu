/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/log'], (search, record, log) => {

    function afterSubmit(context) {
        if (context.type !== context.UserEventType.EDIT) return;

        try {
            const newRecord = context.newRecord;
            const creditMemoId = newRecord.id;

            const createdFrom = newRecord.getValue({ fieldId: 'createdfrom' });
            log.debug('created from',createdFrom);
            if (!createdFrom) {
                log.debug('No source invoice found for this credit memo.');
                return;
            }

           
            const invoice = record.load({
                type: record.Type.INVOICE,
                id: createdFrom,
                isDynamic: false
            });

       
            const orderProductNumber = invoice.getValue({
                fieldId: 'custbody_order_product_number' 
            });

            log.debug('orderProductNumber',orderProductNumber);

            if (!orderProductNumber) {
                log.debug('Order Product Number not found on Invoice');
                return;
            }

            // Search for terminated order product
            // const terminatedSearch = search.create({
            //     type: 'customrecord_rm_ordersproductssync',
            //     filters: [
            //         ['custrecord_isterminated', 'is', 'T'],
            //         'AND',
            //         ['custrecord_rm_op_opnumber', 'is', orderProductNumber]
            //     ],
            //     columns: ['internalid']
            // });

            var terminatedSearch = search.create({
            type: "customrecord_rm_ordersync",
            filters:
            [
                ["custrecord_rm_os_ordernumber","is","20250912-47175"], 
                "AND", 
                ["custrecord_isterminated_parent","is","T"]
            ],
            columns:
            [
                search.createColumn({name: "custrecord_rm_os_ordernumber", label: "Order Number"}),
                search.createColumn({name: "internalid", label: "Internal ID"}),
                search.createColumn({name: "custrecord_opportunity_owner_id", label: "Opportunity Owner ID"})
            ]
            });

            const results = terminatedSearch.run().getRange({ start: 0, end: 1 });

            if (results && results.length > 0) {
                log.debug('Terminated order product found');

                //Get exchange rate from Invoice
                const invoiceExchangeRate = invoice.getValue({ fieldId: 'exchangerate' });
                log.debug('invoice exchange rate', invoiceExchangeRate);

                // Load and update Credit Memo
                const creditMemoRecord = record.load({
                    type: record.Type.CREDIT_MEMO,
                    id: creditMemoId,
                    isDynamic: false
                });

                creditMemoRecord.setValue({
                    fieldId: 'exchangerate',
                    value: invoiceExchangeRate
                });

                creditMemoRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });

                log.debug('Credit Memo updated with invoice exchange rate', invoiceExchangeRate);

            } else {
                log.debug('No terminated order product match found — exchange rate not updated.');
            }

        } catch (error) {
            log.error('Error in afterSubmit', error);
        }
    }

    return {
        afterSubmit
    };
});

const { applyAutomaticReservations } = require('@masthead-data/dataform-package');

applyAutomaticReservations([
    {
        tag: 'test_automation',
        reservation: 'projects/demo-project/locations/us/reservations/demo-res',
        actions: ['masthead-data.test.critical_dashboard']
    }
]);

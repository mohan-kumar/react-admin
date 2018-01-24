import React, { Component } from 'react';
import { GET_LIST, GET_MANY } from 'react-admin';

import Welcome from './Welcome';
import MonthlyRevenue from './MonthlyRevenue';
import NbNewOrders from './NbNewOrders';
import PendingOrders from './PendingOrders';
import PendingReviews from './PendingReviews';
import NewCustomers from './NewCustomers';
import buildApolloDataProvider from '../aorApolloClient';

const styles = {
    welcome: { marginBottom: '2em' },
    flex: { display: 'flex' },
    leftCol: { flex: 1, marginRight: '1em' },
    rightCol: { flex: 1, marginLeft: '1em' },
    singleCol: { marginTop: '2em' },
};

class Dashboard extends Component {
    state = {};

    componentDidMount() {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        buildApolloDataProvider().then(dataProvider => {
            dataProvider(GET_LIST, 'Command', {
                filter: { date_gte: d.toISOString() },
                sort: { field: 'date', order: 'DESC' },
                pagination: { page: 1, perPage: 50 },
            })
                .then(response =>
                    response.data
                        .filter(order => order.status !== 'cancelled')
                        .reduce(
                            (stats, order) => {
                                if (order.status !== 'cancelled') {
                                    stats.revenue += order.total;
                                    stats.nbNewOrders++;
                                }
                                if (order.status === 'ordered') {
                                    stats.pendingOrders.push(order);
                                }
                                return stats;
                            },
                            { revenue: 0, nbNewOrders: 0, pendingOrders: [] }
                        )
                )
                .then(({ revenue, nbNewOrders, pendingOrders }) => {
                    this.setState({
                        revenue: revenue.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                        }),
                        nbNewOrders,
                        pendingOrders,
                    });
                    return pendingOrders;
                })
                .then(pendingOrders =>
                    pendingOrders.map(order => order.customer_id)
                )
                .then(customerIds =>
                    dataProvider(GET_MANY, 'Customer', { ids: customerIds })
                )
                .then(response => response.data)
                .then(customers =>
                    customers.reduce((prev, customer) => {
                        prev[customer.id] = customer; // eslint-disable-line no-param-reassign
                        return prev;
                    }, {})
                )
                .then(customers =>
                    this.setState({ pendingOrdersCustomers: customers })
                );

            dataProvider(GET_LIST, 'Review', {
                filter: { status: 'pending' },
                sort: { field: 'date', order: 'DESC' },
                pagination: { page: 1, perPage: 100 },
            })
                .then(response => response.data)
                .then(reviews => {
                    const nbPendingReviews = reviews.reduce(nb => ++nb, 0);
                    const pendingReviews = reviews.slice(
                        0,
                        Math.min(10, reviews.length)
                    );
                    this.setState({ pendingReviews, nbPendingReviews });
                    return pendingReviews;
                })
                .then(reviews => reviews.map(review => review.customer.id))
                .then(customerIds =>
                    dataProvider(GET_MANY, 'Customer', { ids: customerIds })
                )
                .then(response => response.data)
                .then(customers =>
                    customers.reduce((prev, customer) => {
                        prev[customer.id] = customer; // eslint-disable-line no-param-reassign
                        return prev;
                    }, {})
                )
                .then(customers =>
                    this.setState({ pendingReviewsCustomers: customers })
                );

            dataProvider(GET_LIST, 'Customer', {
                filter: { hasOrdered: true, firstSeen_gte: d.toISOString() },
                sort: { field: 'firstSeen', order: 'DESC' },
                pagination: { page: 1, perPage: 100 },
            })
                .then(response => response.data)
                .then(newCustomers => {
                    this.setState({ newCustomers });
                    this.setState({
                        nbNewCustomers: newCustomers.reduce(nb => ++nb, 0),
                    });
                });
        });
    }

    render() {
        const {
            nbNewCustomers,
            nbNewOrders,
            nbPendingReviews,
            newCustomers,
            pendingOrders,
            pendingOrdersCustomers,
            pendingReviews,
            pendingReviewsCustomers,
            revenue,
        } = this.state;
        return (
            <div>
                <Welcome style={styles.welcome} />
                <div style={styles.flex}>
                    <div style={styles.leftCol}>
                        <div style={styles.flex}>
                            <MonthlyRevenue value={revenue} />
                            <NbNewOrders value={nbNewOrders} />
                        </div>
                        <div style={styles.singleCol}>
                            <PendingOrders
                                orders={pendingOrders}
                                customers={pendingOrdersCustomers}
                            />
                        </div>
                    </div>
                    <div style={styles.rightCol}>
                        <div style={styles.flex}>
                            <PendingReviews
                                nb={nbPendingReviews}
                                reviews={pendingReviews}
                                customers={pendingReviewsCustomers}
                            />
                            <NewCustomers
                                nb={nbNewCustomers}
                                visitors={newCustomers}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default Dashboard;
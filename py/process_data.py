import pandas as pd
import glob
import re
import os
from datetime import datetime

os.makedirs("public/data/facilities", exist_ok = True)
os.makedirs("public/data/map", exist_ok = True)

# national.csv => national.csv
X = pd.read_csv("data/raw/national.csv")
X = X[['date','midnight_count_unique_people_ma','daily_count_unique_people_ma','book_in_count_ma','book_out_count_ma','midnight_count_unique_people',
    'daily_count_unique_people','book_in_count','book_out_count']]
for col in X.columns :
    if col == "date" : continue
    X[col] = X[col].fillna(0.)
    X[col] = round(X[col])
    if col == "daily_count_unique_people" : continue
    if col == "midnight_count_unique_people" : continue
    if col == "book_in_count" : continue
    if col == "book_out_count" : continue
    X.loc[X.index[0:29], col] = -1
X.columns = ['Date', 'Midnight population', '24-hour population', 'Book-ins', 'Book-outs', 'Midnight population count', '24-hour population count', 'Book-ins count', 'Book-outs count']
X['Midnight population count'] = X['Midnight population count'].astype(int)
X['24-hour population count'] = X['24-hour population count'].astype(int)
X['Book-ins count'] = X['Book-ins count'].astype(int)
X['Book-outs count'] = X['Book-outs count'].astype(int)
X.to_csv("public/data/national.csv", index = False)

# monthly_freq.csv 
# facilities/[XXXXXX].csv => facilities/[XXXXXX].csv
#                            facilities.csv
X = pd.read_csv("data/raw/monthly_freq.csv")
X = X[['detention_facility_code', 'name', 'city', 'state', 'type_detailed']].drop_duplicates(['detention_facility_code'])
X['start'] = 0
X['end'] = 197
Q = X[~X['city'].isna()]
X.loc[Q.index, 'city'] = Q.apply(lambda x : x['city'] + ", ", axis = 1)
X['city'] = X['city'].fillna("")
X['place'] = X.apply(lambda x : x['city'] + x['state'], axis = 1)
X = X.drop('city', axis = 1);

L = glob.glob("data/raw/facilities/*")
L = [p.split("/")[-1].replace(".csv", "") for p in L]
assert(len(L) - len(set(L)) == 0)
assert(X['detention_facility_code'].shape[0] == X['detention_facility_code'].drop_duplicates().shape[0])
assert(set(L) == set(X['detention_facility_code']))

def date_func(date) :
    return 12 * (date.year - 2008) + date.month - 10

for index, row in X.iterrows() :
    Y = pd.read_csv("data/raw/facilities/" + row['detention_facility_code'] + ".csv")
    Y = Y[['date', 'midnight_count_unique_people_ma','daily_count_unique_people_ma','midnight_count_unique_people','daily_count_unique_people']]
    for col in Y.columns :
        if col == "date" : continue
        Y[col] = Y[col].fillna(0.)
        Y[col] = round(Y[col])
        Y.loc[Y.index[0:29], 'midnight_count_unique_people_ma'] = -1
        Y.loc[Y.index[0:29], 'daily_count_unique_people_ma'] = -1
    Y.columns = ['Date', 'Midnight population', '24-hour population', 'Midnight population count', '24-hour population count']
    Y['Midnight population count'] = Y['Midnight population count'].astype(int)
    Y['24-hour population count'] = Y['24-hour population count'].astype(int)
    assert (Y['24-hour population count'] >= Y['Midnight population count']).all()
    Y.to_csv("public/data/facilities/" + row['detention_facility_code'] + ".csv", index = False)    

    Y = Y[(Y['24-hour population count'] > 0) | (Y['Midnight population count'] > 0)]
    if Y.shape[0] > 0 :         
        X.loc[index, 'start'] = date_func(pd.to_datetime(Y.iloc[0]['Date']))
        X.loc[index, 'end'] = date_func(pd.to_datetime(Y.iloc[-1]['Date'])) + 1
    
X = X.sort_values('name')
Y = pd.read_csv("data/raw/facility_types.csv")
X = pd.merge(X, Y, left_on = 'type_detailed', right_on = 'type_detailed', how = 'left')
X = X.drop('type_detailed', axis = 1)
X['type'] = X['type'].replace('Family/children', 'Family / Children')
X.to_csv("public/data/facilities.csv", index = False)

# monthly_freq.csv => map/YYYYMM.csv
X = pd.read_csv("data/raw/monthly_freq.csv")
X = X[['detention_facility_code', 'name', 'month', 'latitude', 'longitude', 'daily_unique_avg']].drop_duplicates()
X.columns = ['code', 'name', 'month', 'latitude', 'longitude', 'N']

X['latitude'] = X['latitude'].round(3)
X['longitude'] = X['longitude'].round(3)
X['N'] = X['N'].round(3)

def size(N) :
    if N <= 10 : return 2
    if N <= 100 : return 3.5
    if N <= 500 : return 6
    if N <= 1000 : return 9
    if N <= 1500 : return 12
    return 15

X['size'] = X.apply(lambda x : size(x['N']), axis = 1)

F = set()
for month in sorted(X['month'].drop_duplicates()) :
    Y = X[X['month'] == month]
    F.update(set(Y[Y['N'] > 0.]['code']))
    Y = Y[Y['code'].isin(F)]    
    Y = Y.drop(['month', 'name'], axis = 1)
    Y.to_csv("public/data/map/" + month + ".csv", index = False)

# monthly_freq.csv => monthly.csv
X = pd.read_csv("data/raw/monthly_freq.csv")
Z = pd.DataFrame(columns = ['active', 'total'])
Z.index.name = 'month'
for month in sorted(X['month'].drop_duplicates()) :
    Y = X[X['month'] == month]
    Y = Y[Y['daily_unique_avg'] > 0.]
    Z.loc[month, 'active'] = Y.shape[0]

    Y = X[X['month'] <= month]
    Y = Y[Y['daily_unique_avg'] > 0.]
    Y = Y.drop_duplicates('detention_facility_code')
    Z.loc[month, 'total'] = Y.shape[0]

X = pd.read_csv("data/raw/national.csv")
Q = X.apply(lambda x : pd.to_datetime(x['date']).strftime("%Y-%m"), axis = 1).drop_duplicates().to_frame().reset_index()
Q.columns = ['index', 'month']
Z = pd.merge(Z, Q, left_index = True, right_on = 'month', how = 'left')
Z = Z.set_index('month', verify_integrity = True)
Z.to_csv("public/data/monthly.csv")


X = pd.read_csv("public/data/monthly.csv")
X = X.set_index('month')

for file in sorted(glob.glob("public/data/map/*")) :
    month = re.search(r"(\d\d\d\d-\d\d)", file).group(1)
    Y = pd.read_csv(file)
    assert(X.loc[month]['total'] - Y.shape[0] == 0)
    assert(X.loc[month]['active'] - Y[Y['N'] > 0.].shape[0] == 0)


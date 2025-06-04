import pandas as pd
import glob
import re
import os
from datetime import datetime

os.makedirs("data/proc/facilities", exist_ok=True)
os.makedirs("data/proc/map", exist_ok=True)

# national.csv => 
#   national.csv
X = pd.read_csv("data/raw/national.csv")
X = X[['date','midnight_count_unique_people_ma','daily_count_unique_people_ma','book_in_count_ma','book_out_count_ma']]
for col in X.columns :
    if col == "date" : continue
    X[col] = X[col].fillna(0.)
    X[col] = round(X[col])
    X.loc[X.index[0:29], col] = None
X.columns = ['Date', 'Midnight population', '24-hour population', 'Book-ins', 'Book-outs']
X.to_csv("data/proc/national_avg.csv", index = False)

# national.csv => 
#   national.csv
X = pd.read_csv("data/raw/national.csv")
X = X[['date','midnight_count_unique_people','daily_count_unique_people','book_in_count','book_out_count']]
for col in X.columns :
    if col == "date" : continue
    X[col] = X[col].fillna(0.)
    X[col] = round(X[col]).astype(int).apply(lambda x: f"{x:,}")
X.columns = ['Date', 'Midnight population', '24-hour population', 'Book-ins', 'Book-outs']
X.to_csv("data/proc/national_counts.csv", index = False)

# monthly_freq.csv 
# facilities/[XXXXXX].csv =>
#   facilities/[XXXXXX].csv
#   facilities.csv
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

def func(date) :
    return 12 * (date.year - 2008) + date.month - 10

for index, row in X.iterrows() :
    Y = pd.read_csv("data/raw/facilities/" + row['detention_facility_code'] + ".csv")
    Y = Y[['date', 'midnight_count_unique_people_ma', 'daily_count_unique_people_ma', 'daily_count_unique_people']]
    for col in Y.columns :
        if col == "date" : continue
        Y[col] = Y[col].fillna(0.)
        Y[col] = round(Y[col])
        if (col != "daily_count_unique_people") : Y.loc[Y.index[0:29], col] = None
    Y.columns = ['Date', 'Midnight population', '24-hour population', 'N']
    Y['N'] = Y['N'].astype(int)
    Y.to_csv("data/proc/facilities/" + row['detention_facility_code'] + "_avg.csv", index = False)    

#   Y = Y[(Y['Midnight population'] > 0.) | (Y['24-hour population'] > 0.)]
    Y = Y[Y['N'] > 0]
    if Y.shape[0] > 0 :         
        X.loc[index, 'start'] = func(pd.to_datetime(Y.iloc[0]['Date']))
        X.loc[index, 'end'] = func(pd.to_datetime(Y.iloc[-1]['Date'])) + 1
            
    
    Y = pd.read_csv("data/raw/facilities/" + row['detention_facility_code'] + ".csv")
    Y = Y[['date', 'midnight_count_unique_people', 'daily_count_unique_people']]
    for col in Y.columns :
        if col == "date" : continue
        Y[col] = Y[col].fillna(0.)
        Y[col] = round(Y[col]).astype(int).apply(lambda x: f"{x:,}")
    Y.columns = ['Date', 'Midnight population', '24-hour population']
    Y.to_csv("data/proc/facilities/" + row['detention_facility_code'] + "_count.csv", index = False)    

X = X.sort_values('name')
X.to_csv("data/proc/facilities.csv", index = False)

# monthly_freq.csv =>
# 	map/YYYYMM.csv
#	monthly.csv
X = pd.read_csv("data/raw/monthly_freq.csv")
X = X[['detention_facility_code', 'name', 'month', 'latitude', 'longitude', 'daily_unique_avg']].drop_duplicates()
X.columns = ['code', 'name', 'month', 'latitude', 'longitude', 'N']

X['latitude'] = X['latitude'].round(3)
X['longitude'] = X['longitude'].round(3)
X['N'] = X['N'].round().astype(int)

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
    Y.to_csv("data/proc/map/" + month + ".csv", index = False)

# monthly_freq.csv =>
# 	monthly_freq.csv
X = pd.read_csv("data/raw/monthly_freq.csv")
Z = pd.DataFrame(columns = ['active', 'total'])
Z.index.name = 'month'
for month in sorted(list(X['month'].drop_duplicates())) :
    Y = X[X['month'] == month]
    Y = Y[Y['daily_unique_avg'] > 0.]
    Z.loc[month, 'active'] = Y.shape[0]

    Y = X[X['month'] <= month]
    Y = Y[Y['daily_unique_avg'] > 0.]
    Y = Y.drop_duplicates('detention_facility_code')
    Z.loc[month, 'total'] = Y.shape[0]
Z.to_csv("data/proc/monthly.csv")

# national.csv =>
# 	dmap.csv
X = pd.read_csv("data/raw/national.csv")
Q = X.apply(lambda x : pd.to_datetime(x['date']).strftime("%Y-%m"), axis = 1).drop_duplicates().to_frame().reset_index()
Q.columns = ['index', 'date']
Q = Q[['date', 'index']]
Q.to_csv("data/proc/dmap.csv", index = False)






